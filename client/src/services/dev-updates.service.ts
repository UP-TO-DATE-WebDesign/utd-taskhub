import { api } from "@/lib/api";

export interface SprintReport {
	id: string;
	sprint_id: string;
	month: number;
	year: number;
	title: string;
	content: string;
	stats: {
		total?: number;
		apps?: number;
		features?: number;
		fixes?: number;
		[key: string]: number | undefined;
	};
	external_report_id: string | null;
	created_at: string;
	updated_at: string;
	created_by: { id: string; full_name: string; email: string } | null;
	sprint: {
		id: string;
		name: string;
		start_date: string;
		end_date: string;
		status: string;
	} | null;
}

export const DEV_UPDATE_TYPES = [
	"Feature",
	"Fix",
	"Enhancement",
	"Chore",
	"Refactor",
	"Style",
	"Docs",
	"Perf",
] as const;

export type DevUpdateType = (typeof DEV_UPDATE_TYPES)[number];

export interface DevUpdate {
	id: string;
	app: string;
	date: string;
	type: string;
	change: string;
	description?: string;
	url?: string;
	images?: string[];
	createdBy?: {
		id: number;
		firstName: string;
		lastName: string;
	};
}

export interface DevUpdatesListResult {
	updates: DevUpdate[];
	total: number;
	apps: string[];
}

export interface DevUpdatesFilters {
	app?: string;
	type?: string;
	search?: string;
	page?: number;
	limit?: number;
}

export async function listDevUpdates(
	filters: DevUpdatesFilters = {},
): Promise<DevUpdatesListResult> {
	const qs = new URLSearchParams();
	if (filters.app) qs.set("app", filters.app);
	if (filters.type) qs.set("type", filters.type);
	if (filters.search) qs.set("search", filters.search);
	if (filters.page) qs.set("page", String(filters.page));
	if (filters.limit) qs.set("limit", String(filters.limit));
	const suffix = qs.toString() ? `?${qs.toString()}` : "";

	const res = await api.get<{ success: boolean } & DevUpdatesListResult>(
		`/admin/dev-updates${suffix}`,
	);
	return {
		updates: res.updates ?? [],
		total: res.total ?? 0,
		apps: res.apps ?? [],
	};
}

export async function listSprintReports(
	sprintId?: string,
): Promise<SprintReport[]> {
	const qs = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : "";
	const res = await api.get<{ success: boolean; data: SprintReport[] }>(
		`/admin/sprint-reports${qs}`,
	);
	return res.data;
}

export async function getSprintReport(id: string): Promise<SprintReport> {
	const res = await api.get<{ success: boolean; data: SprintReport }>(
		`/admin/sprint-reports/${id}`,
	);
	return res.data;
}

export async function generateSprintReport(
	sprintId: string,
): Promise<SprintReport> {
	const res = await api.post<{ success: boolean; data: SprintReport }>(
		"/admin/sprint-reports",
		{ sprintId },
	);
	return res.data;
}

