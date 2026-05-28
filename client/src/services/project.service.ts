import { api } from "@/lib/api";
import type { MemberRole, ProjectMember } from "./project-member.service";
import type { Sprint } from "./sprint.service";

export type ProjectStatus = "planning" | "in-progress" | "on-hold" | "completed";

export interface Project {
	id: string;
	name: string;
	key: string;
	slug: string;
	app_domain: string | null;
	description: string | null;
	status: ProjectStatus;
	icon_type: "icon" | "image" | null;
	icon_value: string | null;
	sprint_name: string | null;
	sprint_end_date: string | null;
	sprint_id: string | null;
	sprint: Pick<Sprint, "id" | "name" | "start_date" | "end_date" | "status"> | null;
	tags: string[];
	created_by: string;
	created_at: string;
	updated_at: string;
	project_members: ProjectMember[];
	tasks: { id: string; status: string }[];
}

export interface CreateProjectPayload {
	name: string;
	key?: string;
	slug?: string;
	app_domain?: string | null;
	description?: string;
	status?: ProjectStatus;
	icon_type?: "icon" | "image";
	icon_value?: string;
	sprint_name?: string;
	sprint_end_date?: string;
	sprint_id?: string | null;
	tags?: string[];
}

export interface UpdateProjectPayload {
	name?: string;
	key?: string;
	slug?: string;
	app_domain?: string | null;
	description?: string;
	status?: ProjectStatus;
	icon_type?: "icon" | "image";
	icon_value?: string;
	sprint_name?: string;
	sprint_end_date?: string;
	sprint_id?: string | null;
	tags?: string[];
}

export interface AddMembersOptions {
	userIds: string[];
	role?: MemberRole;
}

export async function listProjects(params?: {
	status?: string;
	search?: string;
	sprint_id?: string;
}): Promise<Project[]> {
	const query = new URLSearchParams();
	if (params?.status) query.set("status", params.status);
	if (params?.search) query.set("search", params.search);
	if (params?.sprint_id) query.set("sprint_id", params.sprint_id);
	const qs = query.toString();
	const res = await api.get<{ success: boolean; data: Project[] }>(
		`/projects${qs ? `?${qs}` : ""}`
	);
	return res.data;
}

export async function getProject(id: string): Promise<Project> {
	const res = await api.get<{ success: boolean; data: Project }>(`/projects/${id}`);
	return res.data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
	const res = await api.post<{ success: boolean; data: Project }>("/projects", payload);
	return res.data;
}

export async function updateProject(
	id: string,
	payload: UpdateProjectPayload
): Promise<Project> {
	const res = await api.patch<{ success: boolean; data: Project }>(`/projects/${id}`, payload);
	return res.data;
}

export async function deleteProject(id: string): Promise<void> {
	await api.delete(`/projects/${id}`);
}
