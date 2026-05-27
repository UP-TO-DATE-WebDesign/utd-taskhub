import { supabase, supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
	["application/pdf", "pdf"],
	[
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"docx",
	],
	[
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"xlsx",
	],
	["application/msword", "doc"],
	["application/vnd.ms-excel", "xls"],
	["text/plain", "txt"],
	["application/zip", "zip"],
	["application/x-zip-compressed", "zip"],
]);

const ATTACHMENT_SELECT =
	"id, task_id, file_url, file_path, file_name, mime_type, file_size, uploaded_by, created_at";

function decodeDataUrl(data) {
	if (typeof data !== "string" || data.trim().length === 0) {
		return null;
	}

	const base64 = data.includes(",") ? data.split(",").pop() : data;
	return Buffer.from(base64, "base64");
}

function sanitizeFileName(name) {
	if (typeof name !== "string" || !name.trim()) return "file";
	return name
		.trim()
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.slice(0, 120);
}

async function fetchTask(projectId, taskId) {
	const { data, error } = await supabase
		.from("tasks")
		.select("id, project_id")
		.eq("id", taskId)
		.eq("project_id", projectId)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function listAttachments(req, res, next) {
	try {
		const { projectId, taskId } = req.params;
		const task = await fetchTask(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const { data, error } = await supabase
			.from("task_attachments")
			.select(ATTACHMENT_SELECT)
			.eq("task_id", taskId)
			.order("created_at", { ascending: false });

		if (error) throw error;

		res.status(200).json({
			success: true,
			count: data.length,
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function createAttachment(req, res, next) {
	try {
		const { projectId, taskId } = req.params;
		const task = await fetchTask(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const contentType = req.body?.content_type;
		const extension = ALLOWED_MIME_TYPES.get(contentType);
		if (!extension) {
			return res.status(400).json({
				success: false,
				message: "Unsupported file type.",
			});
		}

		const buffer = decodeDataUrl(req.body?.data);
		if (!buffer || buffer.length === 0) {
			return res.status(400).json({
				success: false,
				message: "File contents are required.",
			});
		}

		if (buffer.length > ATTACHMENT_MAX_BYTES) {
			return res.status(400).json({
				success: false,
				message: "File must be 10 MB or smaller.",
			});
		}

		const safeName = sanitizeFileName(req.body?.file_name);
		const objectPath = `${projectId}/${taskId}/${Date.now()}-${safeName}`;

		const { error: uploadError } = await supabaseAdmin.storage
			.from(env.supabaseTaskAttachmentsBucket)
			.upload(objectPath, buffer, {
				contentType,
				upsert: false,
			});

		if (uploadError) throw uploadError;

		const { data: publicData } = supabaseAdmin.storage
			.from(env.supabaseTaskAttachmentsBucket)
			.getPublicUrl(objectPath);

		const { data: attachment, error: insertError } = await req.supabase
			.from("task_attachments")
			.insert({
				task_id: taskId,
				file_url: publicData.publicUrl,
				file_path: objectPath,
				file_name: safeName,
				mime_type: contentType,
				file_size: buffer.length,
				uploaded_by: req.profile?.id ?? null,
			})
			.select(ATTACHMENT_SELECT)
			.single();

		if (insertError) {
			// rollback storage on DB failure
			await supabaseAdmin.storage
				.from(env.supabaseTaskAttachmentsBucket)
				.remove([objectPath])
				.catch(() => {});
			throw insertError;
		}

		res.status(201).json({
			success: true,
			data: attachment,
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteAttachment(req, res, next) {
	try {
		const { projectId, taskId, attachmentId } = req.params;
		const task = await fetchTask(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const { data: attachment, error: fetchError } = await supabaseAdmin
			.from("task_attachments")
			.select(ATTACHMENT_SELECT)
			.eq("id", attachmentId)
			.eq("task_id", taskId)
			.maybeSingle();

		if (fetchError) throw fetchError;
		if (!attachment) {
			return res
				.status(404)
				.json({ success: false, message: "Attachment not found." });
		}

		const { error: removeError } = await supabaseAdmin.storage
			.from(env.supabaseTaskAttachmentsBucket)
			.remove([attachment.file_path]);

		if (removeError) throw removeError;

		const { error: deleteError } = await supabaseAdmin
			.from("task_attachments")
			.delete()
			.eq("id", attachmentId);

		if (deleteError) throw deleteError;

		res.status(200).json({
			success: true,
			message: "Attachment deleted.",
		});
	} catch (error) {
		next(error);
	}
}
