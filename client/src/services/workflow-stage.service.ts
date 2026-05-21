import { api } from "@/lib/api";

export interface WorkflowStage {
	id: string;
	project_id: string;
	key: string;
	name: string;
	color: string;
	position: number;
	is_system: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface CreateWorkflowStagePayload {
	name: string;
	color?: string;
	position?: number;
}

export interface UpdateWorkflowStagePayload {
	name?: string;
	color?: string;
	position?: number;
}

export async function listWorkflowStages(
	projectId: string,
): Promise<WorkflowStage[]> {
	const res = await api.get<{
		success: boolean;
		data: { workflow_stages: WorkflowStage[] };
	}>(`/projects/${projectId}/workflow-stages`);
	return res.data.workflow_stages;
}

export async function createWorkflowStage(
	projectId: string,
	payload: CreateWorkflowStagePayload,
): Promise<WorkflowStage> {
	const res = await api.post<{
		success: boolean;
		data: { workflow_stage: WorkflowStage };
	}>(`/projects/${projectId}/workflow-stages`, payload);
	return res.data.workflow_stage;
}

export async function updateWorkflowStage(
	projectId: string,
	id: string,
	payload: UpdateWorkflowStagePayload,
): Promise<WorkflowStage> {
	const res = await api.patch<{
		success: boolean;
		data: { workflow_stage: WorkflowStage };
	}>(`/projects/${projectId}/workflow-stages/${id}`, payload);
	return res.data.workflow_stage;
}

export async function deleteWorkflowStage(
	projectId: string,
	id: string,
): Promise<void> {
	await api.delete(`/projects/${projectId}/workflow-stages/${id}`);
}
