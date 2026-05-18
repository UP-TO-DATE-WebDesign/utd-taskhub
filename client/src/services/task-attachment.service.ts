import { api } from "@/lib/api";

export interface TaskAttachment {
	id: string;
	task_id: string;
	file_url: string;
	file_path: string;
	file_name: string;
	mime_type: string;
	file_size: number;
	uploaded_by: string | null;
	created_at: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Failed to read file."));
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file."));
		reader.readAsDataURL(file);
	});
}

export async function listTaskAttachments(
	projectId: string,
	taskId: string,
): Promise<TaskAttachment[]> {
	const res = await api.get<{
		success: boolean;
		count: number;
		data: TaskAttachment[];
	}>(`/projects/${projectId}/tasks/${taskId}/attachments`);
	return res.data;
}

export async function uploadTaskAttachment(
	projectId: string,
	taskId: string,
	file: File,
): Promise<TaskAttachment> {
	const dataUrl = await readFileAsDataUrl(file);
	const res = await api.post<{
		success: boolean;
		data: TaskAttachment;
	}>(`/projects/${projectId}/tasks/${taskId}/attachments`, {
		data: dataUrl,
		content_type: file.type,
		file_name: file.name,
	});
	return res.data;
}

export async function deleteTaskAttachment(
	projectId: string,
	taskId: string,
	attachmentId: string,
): Promise<void> {
	await api.delete(
		`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
	);
}
