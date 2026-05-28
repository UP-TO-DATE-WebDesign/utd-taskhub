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

export interface UploadImageResult {
	success: boolean;
	url: string;
	originalSize: number;
	optimizedSize: number;
	savings: string;
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

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export async function uploadDevUpdateImage(
	file: File,
): Promise<UploadImageResult> {
	const data = await fileToDataUrl(file);
	return api.post<UploadImageResult>("/admin/sprint-reports/upload-image", {
		data,
	});
}
