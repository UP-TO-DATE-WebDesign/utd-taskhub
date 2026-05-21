// server/src/controllers/admin-report-real.controller.js
// Real-data admin reports endpoint. Aggregates from Supabase.
// Substitutes tasks.estimated_time wherever story_points / actual_hours
// would normally apply (those columns do not exist in the schema).

const TASK_ACTIVE_STATUSES = ["backlog", "todo", "in-progress", "qa"];
const TASK_DONE_STATUSES = ["done", "cancelled"];
const PRIORITY_DISPLAY = {
	urgent: "Critical",
	high: "High",
	medium: "Medium",
	low: "Low",
};

function startOfDay(d) {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

function isoDate(d) {
	return startOfDay(d).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
	return Math.floor(
		(startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000,
	);
}

function buildDateRange(daysBack) {
	const today = startOfDay(new Date());
	const out = [];
	for (let i = daysBack; i >= 0; i--) {
		const d = new Date(today);
		d.setUTCDate(d.getUTCDate() - i);
		out.push(d);
	}
	return out;
}

function deriveProjectStatus(p, ticketsByProject, overdueByProject) {
	if (p.status === "completed") return "Completed";
	const tickets = ticketsByProject.get(p.id) ?? [];
	const hasBlocker = tickets.some(
		(t) =>
			t.priority === "urgent" &&
			!["resolved", "closed", "cancelled"].includes(t.status),
	);
	if (hasBlocker) return "Blocked";

	const overdueCount = overdueByProject.get(p.id) ?? 0;
	const today = startOfDay(new Date()).getTime();
	const sprintPast =
		p.sprint_end_date &&
		new Date(p.sprint_end_date).getTime() < today &&
		p.status !== "completed";

	if (sprintPast || overdueCount > 2) return "At Risk";
	return "On Track";
}

export async function getAdminReportsReal(req, res, next) {
	try {
		const supabase = req.supabase;
		const today = startOfDay(new Date());
		const todayIso = today.toISOString();

		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

		const fourteenDaysAgo = new Date(today);
		fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

		// ---------------- Parallel base queries ----------------
		const [
			projectsRes,
			tasksAllRes,
			ticketsRes,
			activeSprintRes,
			recentSprintsRes,
			projectMembersRes,
		] = await Promise.all([
			supabase
				.from("projects")
				.select(
					"id, name, status, created_by, sprint_id, sprint_end_date",
				),
			supabase
				.from("tasks")
				.select(
					"id, title, status, priority, due_date, project_id, assigned_to, sprint_id, estimated_time, created_at, updated_at",
				),
			supabase
				.from("tickets")
				.select("id, project_id, priority, status"),
			supabase
				.from("sprints")
				.select("id, name, start_date, end_date, status")
				.eq("status", "active")
				.order("start_date", { ascending: false })
				.limit(1)
				.maybeSingle(),
			supabase
				.from("sprints")
				.select("id, name, start_date, end_date, status")
				.in("status", ["active", "completed"])
				.order("end_date", { ascending: false })
				.limit(7),
			supabase
				.from("project_members")
				.select("project_id, user_id, role")
				.eq("role", "owner"),
		]);

		for (const r of [
			projectsRes,
			tasksAllRes,
			ticketsRes,
			activeSprintRes,
			recentSprintsRes,
			projectMembersRes,
		]) {
			if (r.error) throw r.error;
		}

		const projects = projectsRes.data ?? [];
		const tasks = tasksAllRes.data ?? [];
		const tickets = ticketsRes.data ?? [];
		const activeSprint = activeSprintRes.data ?? null;
		const recentSprints = (recentSprintsRes.data ?? []).slice().reverse();
		const owners = projectMembersRes.data ?? [];

		// Profile lookup for project owners + task assignees
		const profileIds = new Set();
		projects.forEach((p) => p.created_by && profileIds.add(p.created_by));
		owners.forEach((o) => o.user_id && profileIds.add(o.user_id));
		tasks.forEach((t) => t.assigned_to && profileIds.add(t.assigned_to));

		let profilesById = new Map();
		if (profileIds.size > 0) {
			const { data: profilesData, error: profilesErr } = await supabase
				.from("profiles")
				.select("id, full_name")
				.in("id", Array.from(profileIds));
			if (profilesErr) throw profilesErr;
			profilesById = new Map(
				(profilesData ?? []).map((p) => [p.id, p.full_name ?? "—"]),
			);
		}

		const projectsById = new Map(projects.map((p) => [p.id, p]));
		const ownersByProject = new Map(
			owners.map((o) => [o.project_id, o.user_id]),
		);

		// Ticket aggregates
		const ticketsByProject = new Map();
		tickets.forEach((t) => {
			if (!ticketsByProject.has(t.project_id))
				ticketsByProject.set(t.project_id, []);
			ticketsByProject.get(t.project_id).push(t);
		});

		// Task aggregates
		const tasksByProject = new Map();
		const overdueByProject = new Map();
		tasks.forEach((t) => {
			if (!tasksByProject.has(t.project_id))
				tasksByProject.set(t.project_id, []);
			tasksByProject.get(t.project_id).push(t);

			const isOverdue =
				t.due_date &&
				new Date(t.due_date).getTime() < today.getTime() &&
				!TASK_DONE_STATUSES.includes(t.status);
			if (isOverdue) {
				overdueByProject.set(
					t.project_id,
					(overdueByProject.get(t.project_id) ?? 0) + 1,
				);
			}
		});

		// ----------------- 1. projectStatusSummary -----------------
		const projectRows = projects.map((p) => {
			const pTasks = tasksByProject.get(p.id) ?? [];
			const total = pTasks.length;
			const done = pTasks.filter((t) => t.status === "done").length;
			const progress = total === 0 ? 0 : Math.round((done / total) * 100);

			const ownerId = ownersByProject.get(p.id) ?? p.created_by;
			const ownerName = profilesById.get(ownerId) ?? "—";
			const deadline = p.sprint_end_date
				? p.sprint_end_date.slice(0, 10)
				: null;

			const displayStatus = deriveProjectStatus(
				p,
				ticketsByProject,
				overdueByProject,
			);

			return {
				id: p.id,
				name: p.name,
				status: displayStatus,
				progress,
				owner: ownerName,
				deadline,
			};
		});

		const totals = {
			totalProjects: projects.length,
			onTrack: projectRows.filter((p) => p.status === "On Track").length,
			atRisk: projectRows.filter((p) => p.status === "At Risk").length,
			blocked: projectRows.filter((p) => p.status === "Blocked").length,
			completed: projectRows.filter((p) => p.status === "Completed").length,
		};

		const overallProgressPct =
			projectRows.length === 0
				? 0
				: Math.round(
						projectRows.reduce((s, p) => s + p.progress, 0) /
							projectRows.length,
					);

		const projectStatusSummary = {
			totals,
			milestones: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
			overallProgressPct,
			projects: projectRows.slice(0, 12),
		};

		// ----------------- 2. taskCompletion (last ~30 days) -----------------
		const range30 = buildDateRange(30);
		const taskCompletionFull = range30.map((d) => {
			const dayMs = d.getTime() + 86400000; // end of day
			const planned = tasks.filter(
				(t) => t.due_date && new Date(t.due_date).getTime() <= dayMs,
			).length;
			const actual = tasks.filter(
				(t) =>
					t.status === "done" &&
					t.updated_at &&
					new Date(t.updated_at).getTime() <= dayMs,
			).length;
			return { date: isoDate(d), planned, actual };
		});
		const taskCompletion = taskCompletionFull.filter((_, i) => i % 3 === 0);

		// ----------------- 3. burnChart (active sprint) -----------------
		let burnChart = {
			sprintId: null,
			sprintName: "No active sprint",
			totalScope: 0,
			data: [],
		};
		if (activeSprint) {
			const sprintTasks = tasks.filter(
				(t) => t.sprint_id === activeSprint.id,
			);
			const useEstimate = sprintTasks.some(
				(t) => (t.estimated_time ?? 0) > 0,
			);
			const totalScope = useEstimate
				? sprintTasks.reduce((s, t) => s + (t.estimated_time ?? 0), 0)
				: sprintTasks.length;

			const start = startOfDay(new Date(activeSprint.start_date));
			const end = startOfDay(new Date(activeSprint.end_date));
			const totalDays = Math.max(1, daysBetween(start, end));
			const lastDay = today.getTime() < end.getTime() ? today : end;
			const elapsed = Math.max(0, daysBetween(start, lastDay));

			const data = [];
			for (let i = 0; i <= elapsed; i++) {
				const day = new Date(start);
				day.setUTCDate(day.getUTCDate() + i);
				const dayMs = day.getTime() + 86400000;
				const completedNum = sprintTasks
					.filter(
						(t) =>
							t.status === "done" &&
							t.updated_at &&
							new Date(t.updated_at).getTime() <= dayMs,
					)
					.reduce(
						(s, t) =>
							s + (useEstimate ? (t.estimated_time ?? 0) : 1),
						0,
					);
				data.push({
					day: `Day ${i + 1}`,
					remaining: Math.max(0, totalScope - completedNum),
					completed: completedNum,
					idealRemaining: Math.round(
						totalScope * (1 - i / totalDays),
					),
				});
			}

			burnChart = {
				sprintId: activeSprint.id,
				sprintName: activeSprint.name,
				totalScope,
				data,
			};
		}

		// ----------------- 4. cumulativeFlow (last 14 days) -----------------
		const range14 = buildDateRange(13);
		const cumulativeFlow = range14.map((d) => {
			const dayMs = d.getTime() + 86400000;
			const snap = { todo: 0, inProgress: 0, review: 0, done: 0 };
			tasks.forEach((t) => {
				if (!t.created_at) return;
				if (new Date(t.created_at).getTime() > dayMs) return;
				if (TASK_DONE_STATUSES.includes(t.status)) {
					if (
						t.updated_at &&
						new Date(t.updated_at).getTime() <= dayMs
					) {
						snap.done += 1;
						return;
					}
					snap.inProgress += 1;
					return;
				}
				switch (t.status) {
					case "in-progress":
						snap.inProgress += 1;
						break;
					case "qa":
						snap.review += 1;
						break;
					default:
						snap.todo += 1;
				}
			});
			return { date: isoDate(d), ...snap };
		});

		// ----------------- 5. overdueTasks (limit 25) -----------------
		const overdueTasks = tasks
			.filter(
				(t) =>
					t.due_date &&
					new Date(t.due_date).getTime() < today.getTime() &&
					!TASK_DONE_STATUSES.includes(t.status),
			)
			.map((t) => {
				const project = projectsById.get(t.project_id);
				const due = new Date(t.due_date);
				return {
					id: t.id.slice(0, 8).toUpperCase(),
					title: t.title,
					assignee: profilesById.get(t.assigned_to) ?? "Unassigned",
					project: project?.name ?? "—",
					deadline: due.toISOString().slice(0, 10),
					priority: PRIORITY_DISPLAY[t.priority] ?? "Medium",
					daysOverdue: daysBetween(due, today),
				};
			})
			.sort((a, b) => b.daysOverdue - a.daysOverdue)
			.slice(0, 25);

		// ----------------- 6. velocity (last 7 sprints) -----------------
		const velocity = recentSprints.map((s) => {
			const sTasks = tasks.filter((t) => t.sprint_id === s.id);
			const useEstimate = sTasks.some(
				(t) => (t.estimated_time ?? 0) > 0,
			);
			const committed = useEstimate
				? sTasks.reduce((sum, t) => sum + (t.estimated_time ?? 0), 0)
				: sTasks.length;
			const completed = useEstimate
				? sTasks
						.filter((t) => t.status === "done")
						.reduce(
							(sum, t) => sum + (t.estimated_time ?? 0),
							0,
						)
				: sTasks.filter((t) => t.status === "done").length;
			return { sprint: s.name, committed, completed };
		});

		// ----------------- 7. timeTracking (per project) -----------------
		const timeAgg = new Map();
		tasks.forEach((t) => {
			const minutes = t.estimated_time ?? 0;
			if (minutes <= 0) return;
			const key = t.project_id;
			if (!timeAgg.has(key))
				timeAgg.set(key, { estimated: 0, actual: 0 });
			const bucket = timeAgg.get(key);
			bucket.estimated += minutes;
			if (t.status === "done") bucket.actual += minutes;
		});
		const timeTracking = Array.from(timeAgg.entries())
			.map(([projectId, v]) => ({
				project: projectsById.get(projectId)?.name ?? "—",
				estimatedHours: Math.round(v.estimated / 60),
				actualHours: Math.round(v.actual / 60),
			}))
			.filter((row) => row.estimatedHours > 0)
			.sort((a, b) => b.estimatedHours - a.estimatedHours)
			.slice(0, 10);

		const payload = {
			generatedAt: new Date().toISOString(),
			projectStatusSummary,
			taskCompletion,
			burnChart,
			cumulativeFlow,
			overdueTasks,
			velocity,
			timeTracking,
		};

		return res.json({ success: true, data: payload });
	} catch (err) {
		return next(err);
	}
}
