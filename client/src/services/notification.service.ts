import { api } from "@/lib/api";

export type NotificationType =
	| "project.member_added"
	| "task.assigned"
	| "ticket.closed"
	| "user.signed_up"
	| "task.due_soon"
	| "task.overdue"
	| "sprint.started"
	| "sprint.ended"
	| "role.changed"
	| "comment.mentioned";

export interface NotificationData {
	project_id?: string;
	task_id?: string;
	ticket_id?: string;
	sprint_id?: string;
	new_user_id?: string;
	email?: string;
	role?: string;
	role_key?: string;
	scope?: "global" | "project";
	due_date?: string;
	comment_id?: string;
}

export interface Notification {
	id: string;
	user_id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	data: NotificationData;
	read: boolean;
	created_at: string;
}

export interface ListNotificationsParams {
	unread?: boolean;
	limit?: number;
	before?: string;
}

export async function listNotifications(
	params?: ListNotificationsParams,
): Promise<Notification[]> {
	const query = new URLSearchParams();
	if (params?.unread) query.set("unread", "true");
	if (params?.limit) query.set("limit", String(params.limit));
	if (params?.before) query.set("before", params.before);
	const qs = query.toString();
	const res = await api.get<{ success: boolean; data: Notification[] }>(
		`/notifications${qs ? `?${qs}` : ""}`,
	);
	return res.data;
}

export async function getUnreadCount(): Promise<number> {
	const res = await api.get<{ success: boolean; data: { count: number } }>(
		"/notifications/unread-count",
	);
	return res.data.count;
}

export async function markRead(id: string): Promise<Notification> {
	const res = await api.post<{ success: boolean; data: Notification }>(
		`/notifications/${id}/read`,
		{},
	);
	return res.data;
}

export async function markAllRead(): Promise<void> {
	await api.post("/notifications/read-all", {});
}

export async function requestStreamTicket(): Promise<string> {
	const res = await api.post<{
		success: boolean;
		data: { ticket: string; expires_in: number };
	}>("/notifications/stream/ticket", {});
	return res.data.ticket;
}
