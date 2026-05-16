import { api } from "@/lib/api";

export type ActivitySource = "activity_logs" | "system_logs";

export type ActivityEntityType =
	| "project"
	| "board"
	| "task"
	| "ticket"
	| "comment"
	| "user"
	| "project_member"
	| "invitation";

export interface ActivityActor {
	id: string;
	full_name: string | null;
	email: string | null;
	avatar_url: string | null;
}

export interface ActivityEntry {
	id: string;
	source: ActivitySource;
	project_id: string | null;
	actor: ActivityActor | null;
	entity_type: ActivityEntityType;
	entity_id: string;
	action: string;
	metadata: Record<string, unknown>;
	created_at: string;
}

export interface ListProjectActivityParams {
	page?: number;
	limit?: number;
	entityType?: ActivityEntityType;
	action?: string;
	fromDate?: string;
	toDate?: string;
}

export interface ProjectActivityList {
	count: number;
	page: number;
	limit: number;
	totalPages: number;
	data: ActivityEntry[];
}

export async function listProjectActivity(
	projectId: string,
	params: ListProjectActivityParams = {},
): Promise<ProjectActivityList> {
	const query = new URLSearchParams();

	if (params.page) query.set("page", String(params.page));
	if (params.limit) query.set("limit", String(params.limit));
	if (params.entityType) query.set("entityType", params.entityType);
	if (params.action) query.set("action", params.action);
	if (params.fromDate) query.set("fromDate", params.fromDate);
	if (params.toDate) query.set("toDate", params.toDate);

	const qs = query.toString();
	const res = await api.get<{ success: boolean } & ProjectActivityList>(
		`/projects/${projectId}/activity${qs ? `?${qs}` : ""}`,
	);

	return {
		count: res.count ?? 0,
		page: res.page ?? 1,
		limit: res.limit ?? params.limit ?? 50,
		totalPages: res.totalPages ?? 1,
		data: res.data ?? [],
	};
}
