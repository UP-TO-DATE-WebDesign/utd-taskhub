import { api } from "@/lib/api";

export interface TaskType {
	id: string;
	key: string;
	name: string;
	description: string | null;
	color: string;
	icon: string;
	position: number;
	is_default: boolean;
	is_system: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface CreateTaskTypePayload {
	key: string;
	name: string;
	description?: string | null;
	color?: string;
	icon?: string;
	position?: number;
	is_default?: boolean;
}

export interface UpdateTaskTypePayload {
	name?: string;
	description?: string | null;
	color?: string;
	icon?: string;
	position?: number;
	is_default?: boolean;
}

export async function listTaskTypes(): Promise<TaskType[]> {
	const res = await api.get<{
		success: boolean;
		data: { task_types: TaskType[] };
	}>("/task-types");
	return res.data.task_types;
}

export async function createTaskType(
	payload: CreateTaskTypePayload,
): Promise<TaskType> {
	const res = await api.post<{
		success: boolean;
		data: { task_type: TaskType };
	}>("/task-types", payload);
	return res.data.task_type;
}

export async function updateTaskType(
	id: string,
	payload: UpdateTaskTypePayload,
): Promise<TaskType> {
	const res = await api.patch<{
		success: boolean;
		data: { task_type: TaskType };
	}>(`/task-types/${id}`, payload);
	return res.data.task_type;
}

export async function deleteTaskType(id: string): Promise<void> {
	await api.delete(`/task-types/${id}`);
}
