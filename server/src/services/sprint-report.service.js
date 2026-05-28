import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { lexicalToPlainText } from "../utils/lexical-text.js";

// Maps a sprint's completed work into gist "dev update" objects for the
// external Dev Updates & Reports API.

const TICKET_TYPE_TO_UPDATE = {
	bug: "Fix",
	feature_request: "Feature",
	support: "Enhancement",
	issue: "Fix",
	other: "Chore",
};
const TASK_TYPE_TO_UPDATE = {
	task: "Feature",
	bug: "Fix",
	feature: "Feature",
	story: "Feature",
	epic: "Feature",
};

function appOf(project) {
	return project?.app_domain || project?.slug || project?.name || "unknown";
}

function isoDate(value, fallback) {
	const d = value ? new Date(value) : null;
	if (d && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
	return fallback;
}

export async function buildSprintUpdates(sprintId) {
	const { data: sprint, error: sprintErr } = await supabaseAdmin
		.from("sprints")
		.select("id, name, start_date, end_date")
		.eq("id", sprintId)
		.maybeSingle();
	if (sprintErr) throw sprintErr;
	if (!sprint) return null;

	const fallbackDate = isoDate(
		sprint.end_date,
		new Date().toISOString().slice(0, 10),
	);

	const { data: tasks, error: tasksErr } = await supabaseAdmin
		.from("tasks")
		.select(
			"id, title, description, status, ticket_id, updated_at, project_id, project:projects ( name, slug, app_domain ), task_type:task_types ( key )",
		)
		.eq("sprint_id", sprintId)
		.eq("status", "done");
	if (tasksErr) throw tasksErr;

	const updates = [];

	for (const t of tasks ?? []) {
		const description = lexicalToPlainText(t.description);
		updates.push({
			// app: appOf(t.project),
			app: "testing-report.tasks.com", //appOf(tk.project),
			date: isoDate(t.updated_at, fallbackDate),
			type: TASK_TYPE_TO_UPDATE[t.task_type?.key] ?? "Feature",
			change: t.title,
			...(description ? { description } : {}),
			url: `${env.appUrl}/projects/${t.project_id}`,
		});
	}

	const ticketIds = (tasks ?? []).map((t) => t.ticket_id).filter(Boolean);

	if (ticketIds.length > 0) {
		const { data: tickets, error: ticketsErr } = await supabaseAdmin
			.from("tickets")
			.select(
				"id, title, description, type, status, updated_at, project_id, project:projects ( name, slug, app_domain )",
			)
			.in("id", ticketIds)
			.eq("status", "closed");
		if (ticketsErr) throw ticketsErr;

		for (const tk of tickets ?? []) {
			const description = lexicalToPlainText(tk.description);
			updates.push({
				app: "testing-report.tickets.com", //appOf(tk.project),
				date: isoDate(tk.updated_at, fallbackDate),
				type: TICKET_TYPE_TO_UPDATE[tk.type] || "Fix",
				change: tk.title,
				...(description ? { description } : {}),
				url: `${env.appUrl}/projects/${tk.project_id}`,
			});
		}
	}

	const month = sprint.end_date
		? new Date(sprint.end_date).getUTCMonth() + 1
		: new Date().getUTCMonth() + 1;
	const year = sprint.end_date
		? new Date(sprint.end_date).getUTCFullYear()
		: new Date().getUTCFullYear();

	return { sprint, updates, month, year };
}
