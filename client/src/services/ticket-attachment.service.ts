import { api } from "@/lib/api";

export interface TicketAttachment {
	id: string;
	ticket_id: string;
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

export async function listTicketAttachments(
	projectId: string,
	ticketId: string,
): Promise<TicketAttachment[]> {
	const res = await api.get<{
		success: boolean;
		count: number;
		data: TicketAttachment[];
	}>(`/projects/${projectId}/tickets/${ticketId}/attachments`);
	return res.data;
}

export async function uploadTicketAttachment(
	projectId: string,
	ticketId: string,
	file: File,
): Promise<TicketAttachment> {
	const dataUrl = await readFileAsDataUrl(file);
	const res = await api.post<{
		success: boolean;
		data: TicketAttachment;
	}>(`/projects/${projectId}/tickets/${ticketId}/attachments`, {
		data: dataUrl,
		content_type: file.type,
		file_name: file.name,
	});
	return res.data;
}

export async function deleteTicketAttachment(
	projectId: string,
	ticketId: string,
	attachmentId: string,
): Promise<void> {
	await api.delete(
		`/projects/${projectId}/tickets/${ticketId}/attachments/${attachmentId}`,
	);
}
