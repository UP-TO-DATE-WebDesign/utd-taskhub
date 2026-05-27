import { api } from "@/lib/api";

export interface CommentAuthor {
	id: string;
	full_name: string | null;
	email: string;
	avatar_url: string | null;
}

export interface TaskComment {
	id: string;
	body: string;
	task_id: string | null;
	ticket_id: string | null;
	parent_comment_id: string | null;
	mentioned_user_ids: string[];
	created_at: string;
	updated_at: string;
	author: CommentAuthor | null;
}

export async function listTaskComments(
	projectId: string,
	taskId: string,
): Promise<TaskComment[]> {
	const res = await api.get<{
		success: boolean;
		count: number;
		data: TaskComment[];
	}>(`/projects/${projectId}/tasks/${taskId}/comments`);
	return res.data;
}

export async function createTaskComment(
	projectId: string,
	taskId: string,
	body: string,
	parentCommentId: string | null = null,
	mentionedUserIds: string[] = [],
): Promise<TaskComment> {
	const res = await api.post<{
		success: boolean;
		message: string;
		data: TaskComment;
	}>(`/projects/${projectId}/tasks/${taskId}/comments`, {
		body,
		parent_comment_id: parentCommentId,
		mentioned_user_ids: mentionedUserIds,
	});
	return res.data;
}

export async function updateTaskComment(
	projectId: string,
	taskId: string,
	commentId: string,
	body: string,
): Promise<TaskComment> {
	const res = await api.patch<{
		success: boolean;
		message: string;
		data: TaskComment;
	}>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
		body,
	});
	return res.data;
}

export async function deleteTaskComment(
	projectId: string,
	taskId: string,
	commentId: string,
): Promise<void> {
	await api.delete(
		`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
	);
}
