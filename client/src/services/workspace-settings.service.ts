import { api } from "@/lib/api";

export interface WorkspaceSettings {
	id: string;
	workspace_name: string;
	workspace_timezone: string;
	workspace_language: string;
	enable_time_logging: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface UpdateWorkspaceSettingsPayload {
	workspace_name?: string;
	workspace_timezone?: string;
	workspace_language?: string;
	enable_time_logging?: boolean;
}

export interface WorkspaceFeatureFlags {
	enable_time_logging: boolean;
}

export async function getWorkspaceFeatureFlags(): Promise<WorkspaceFeatureFlags> {
	const res = await api.get<{
		success: boolean;
		data: { flags: WorkspaceFeatureFlags };
	}>("/workspace-settings/feature-flags");
	return res.data.flags;
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
	const res = await api.get<{
		success: boolean;
		data: { settings: WorkspaceSettings };
	}>("/workspace-settings");
	return res.data.settings;
}

export async function updateWorkspaceSettings(
	payload: UpdateWorkspaceSettingsPayload,
): Promise<WorkspaceSettings> {
	const res = await api.patch<{
		success: boolean;
		data: { settings: WorkspaceSettings };
	}>("/workspace-settings", payload);
	return res.data.settings;
}
