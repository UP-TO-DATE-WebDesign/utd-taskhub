import { supabaseAdmin } from "../config/supabase.js";
import { publish } from "./sse-hub.service.js";

export const NotificationType = Object.freeze({
	PROJECT_MEMBER_ADDED: "project.member_added",
	TASK_ASSIGNED: "task.assigned",
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

	const rows = unique.map((user_id) => ({
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
	}

	return inserted;
}
