import { supabaseAdmin } from "../config/supabase.js";
import { publish } from "./sse-hub.service.js";
import {
	sendNotificationEmail,
	EMAIL_CATEGORY_BY_TYPE,
} from "./notification-email.service.js";
import { mergeSettings } from "../utils/notification-settings.js";

export const NotificationType = Object.freeze({
	PROJECT_MEMBER_ADDED: "project.member_added",
	PROJECT_MEMBER_REMOVED: "project.member_removed",
	TASK_ASSIGNED: "task.assigned",
	TASK_UPDATED: "task.updated",
	TICKET_CLOSED: "ticket.closed",
	USER_SIGNED_UP: "user.signed_up",
	TASK_DUE_SOON: "task.due_soon",
	TASK_OVERDUE: "task.overdue",
	SPRINT_STARTED: "sprint.started",
	SPRINT_ENDED: "sprint.ended",
	ROLE_CHANGED: "role.changed",
	COMMENT_MENTION: "comment.mentioned",
});

export async function createNotifications({
	userIds,
	type,
	title,
	body = null,
	data = {},
}) {
	const unique = [...new Set((userIds || []).filter(Boolean))];
	if (unique.length === 0) return [];

	// Load each recipient's preferences + email so we can honor per-user toggles.
	const { data: profiles, error: profilesError } = await supabaseAdmin
		.from("profiles")
		.select("id, email, notification_settings")
		.in("id", unique);

	if (profilesError) {
		console.error("[notif] settings fetch failed:", profilesError.message);
	}

	const prefsById = new Map(
		(profiles || []).map((p) => [
			p.id,
			{ email: p.email, settings: mergeSettings(p.notification_settings) },
		]),
	);

	// In-app delivery: keep only users whose system toggle for this type is on
	// (default-on when the user has no row or the key is missing).
	const recipients = unique.filter((user_id) => {
		const entry = prefsById.get(user_id);
		return entry ? entry.settings.system[type] !== false : true;
	});

	if (recipients.length === 0) return [];

	const rows = recipients.map((user_id) => ({
		user_id,
		type,
		title,
		body,
		data,
	}));

	const { data: inserted, error } = await supabaseAdmin
		.from("notifications")
		.insert(rows)
		.select();

	if (error) {
		console.error("[notif] insert failed:", error.message);
		return [];
	}

	for (const row of inserted) {
		publish(row.user_id, row);

		// Email delivery: best-effort, gated by email_enabled + category toggle.
		const entry = prefsById.get(row.user_id);
		if (!entry || !entry.email) continue;
		const { settings, email } = entry;
		if (settings.email_enabled !== true) continue;

		const category = EMAIL_CATEGORY_BY_TYPE[row.type];
		if (!category || settings.email[category] === false) continue;

		sendNotificationEmail({
			to: email,
			title: row.title,
			body: row.body,
			type: row.type,
			data: row.data,
		}).catch((e) => console.error("[notif-email]", e));
	}

	return inserted;
}
