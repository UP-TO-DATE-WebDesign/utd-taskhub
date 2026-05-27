import { api } from "@/lib/api";

export interface TimeLogAuthor {
	id: string;
	full_name: string | null;
	email: string;
	avatar_url: string | null;
}

export interface TimeLog {
	id: string;
	task_id: string;
	user_id: string;
	sprint_id: string | null;
	duration_minutes: number;
	description: string | null;
	logged_date: string;
	created_at: string;
	updated_at: string;
	logged_by: TimeLogAuthor | null;
}

export interface CreateTimeLogPayload {
	duration_minutes: number;
	description?: string | null;
	logged_date?: string;
}

export interface UpdateTimeLogPayload {
	duration_minutes?: number;
	description?: string | null;
	logged_date?: string;
}

export async function listTimeLogs(
	projectId: string,
	taskId: string,
): Promise<TimeLog[]> {
	const res = await api.get<{
		success: boolean;
		count: number;
		data: TimeLog[];
	}>(`/projects/${projectId}/tasks/${taskId}/time-logs`);
	return res.data;
}

export async function createTimeLog(
	projectId: string,
	taskId: string,
	payload: CreateTimeLogPayload,
): Promise<TimeLog> {
	const res = await api.post<{ success: boolean; data: TimeLog }>(
		`/projects/${projectId}/tasks/${taskId}/time-logs`,
		payload,
	);
	return res.data;
}

export async function updateTimeLog(
	projectId: string,
	taskId: string,
	logId: string,
	patch: UpdateTimeLogPayload,
): Promise<TimeLog> {
	const res = await api.patch<{ success: boolean; data: TimeLog }>(
		`/projects/${projectId}/tasks/${taskId}/time-logs/${logId}`,
		patch,
	);
	return res.data;
}

export async function deleteTimeLog(
	projectId: string,
	taskId: string,
	logId: string,
): Promise<void> {
	await api.delete(
		`/projects/${projectId}/tasks/${taskId}/time-logs/${logId}`,
	);
}
