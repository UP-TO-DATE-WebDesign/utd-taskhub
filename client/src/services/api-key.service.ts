import { api } from "@/lib/api";

export type ApiKeyScope =
	| "tickets:write"
	| "tickets:read"
	| "tasks:write"
	| "tasks:read"
	| "status:update";

export const ALL_SCOPES: ApiKeyScope[] = [
	"tickets:write",
	"tickets:read",
	"tasks:write",
	"tasks:read",
	"status:update",
];

export interface ApiKey {
	id: string;
	name: string;
	key_prefix: string;
	project_id: string;
	scopes: ApiKeyScope[];
	expires_at: string | null;
	last_used_at: string | null;
	last_used_ip: string | null;
	revoked_at: string | null;
	created_at: string;
	project: { id: string; name: string; key: string } | null;
}

export interface CreatedApiKey extends ApiKey {
	key: string;
}

export interface CreateApiKeyPayload {
	name: string;
	project_id: string;
	scopes: ApiKeyScope[];
	expires_at?: string | null;
}

export async function listApiKeys(): Promise<ApiKey[]> {
	const res = await api.get<{ success: boolean; data: ApiKey[] }>(
		"/api-keys",
	);
	return res.data;
}

export async function createApiKey(
	payload: CreateApiKeyPayload,
): Promise<CreatedApiKey> {
	const res = await api.post<{ success: boolean; data: CreatedApiKey }>(
		"/api-keys",
		payload,
	);
	return res.data;
}

export async function revokeApiKey(id: string): Promise<void> {
	await api.delete(`/api-keys/${id}`);
}

export async function getFullApiKey(
	id: string,
): Promise<{ key: string; plaintext: string } | null> {
	const res = await api.get<{
		success: boolean;
		data: { key: string; plaintext: string };
	}>(`/api-keys/${id}`);
	return res.data;
}
