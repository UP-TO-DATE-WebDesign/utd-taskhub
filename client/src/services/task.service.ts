import { api } from "@/lib/api";

// Status is now the workflow_stages.key for the task's project.
// System keys: backlog, todo, in-progress, qa, done, cancelled.
// Custom keys are slugified from user-defined stage names.
export type ApiTaskStatus = string;
export type ApiTaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskProfile {
	id: string;
	full_name: string | null;
	email: string;
	avatar_url: string | null;
}

export interface TaskSprint {
	id: string;
	name: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
}

export interface TaskTypeRef {
	id: string;
	key: string;
	name: string;
	color: string;
	icon: string;
}

export interface Task {
	id: string;
	project_id: string;
	board_column_id: string | null;
	ticket_id: string | null;
	ticket: { ticket_code: string } | null;
	title: string;
	description: string | null;
	developer_notes: string | null;
	status: ApiTaskStatus;
	priority: ApiTaskPriority;
	assigned_to: TaskProfile | null;
	created_by: TaskProfile;
	due_date: string | null;
	tags: string[];
	position: number;
	sprint_id?: string | null;
	sprint?: TaskSprint | null;
	estimated_time?: number;
	parent_task_id: string | null;
	task_type_id: string | null;
	task_type: TaskTypeRef | null;
	created_at: string;
	updated_at: string;
}

export interface CreateTaskPayload {
	title: string;
	description?: string;
	status?: ApiTaskStatus;
	priority?: ApiTaskPriority;
	assigned_to?: string;
	due_date?: string;
	tags?: string[];
	project_id?: string;
	sprint_id?: string;
	estimated_time?: number; // in minutes
	parent_task_id?: string;
	task_type_id?: string | null;
}

export interface UpdateTaskPayload {
	title?: string;
	description?: string;
	developer_notes?: string;
	status?: ApiTaskStatus;
	priority?: ApiTaskPriority;
	assigned_to?: string | null;
	due_date?: string | null;
	tags?: string[];
	project_id?: string;
	sprint_id?: string | null;
	estimated_time?: number; // in minutes
	parent_task_id?: string | null;
	task_type_id?: string | null;
}

export interface ListAllTasksParams {
	project_id?: string;
	status?: ApiTaskStatus;
	priority?: ApiTaskPriority;
	assigned_to?: string;
	search?: string;
}

export async function listAllTasks(
	params?: ListAllTasksParams,
): Promise<Task[]> {
	const query = new URLSearchParams();
	if (params?.project_id) query.set("project_id", params.project_id);
	if (params?.status) query.set("status", params.status);
	if (params?.priority) query.set("priority", params.priority);
	if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
	if (params?.search) query.set("search", params.search);
	const qs = query.toString();
	const res = await api.get<{ success: boolean; data: Task[] }>(
		`/tasks${qs ? `?${qs}` : ""}`,
	);
	return res.data;
}

export async function listTasks(
	projectId: string,
	params?: { status?: string; priority?: string; assigned_to?: string },
): Promise<Task[]> {
	const query = new URLSearchParams();
	if (params?.status) query.set("status", params.status);
	if (params?.priority) query.set("priority", params.priority);
	if (params?.assigned_to) query.set("assigned_to", params.assigned_to);
	const qs = query.toString();
	const res = await api.get<{ success: boolean; data: Task[] }>(
		`/projects/${projectId}/tasks${qs ? `?${qs}` : ""}`,
	);
	return res.data;
}

export async function createTask(
	projectId: string,
	payload: CreateTaskPayload,
): Promise<Task> {
	const res = await api.post<{ success: boolean; data: Task }>(
		`/projects/${projectId}/tasks`,
		payload,
	);
	return res.data;
}
export async function getTaskDetails(
	projectId: string,
	taskId: string,
): Promise<Task> {
	const res = await api.get<{ success: boolean; data: Task }>(
		`/projects/${projectId}/tasks/${taskId}`,
	);
	return res.data;
}

export async function updateTask(
	projectId: string,
	taskId: string,
	payload: UpdateTaskPayload,
): Promise<Task> {
	const res = await api.patch<{ success: boolean; data: Task }>(
		`/projects/${projectId}/tasks/${taskId}`,
		payload,
	);
	return res.data;
}

export async function deleteTask(
	projectId: string,
	taskId: string,
): Promise<void> {
	await api.delete(`/projects/${projectId}/tasks/${taskId}`);
}
