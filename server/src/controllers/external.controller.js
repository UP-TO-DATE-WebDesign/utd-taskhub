import { supabaseAdmin } from "../config/supabase.js";
import { validateCreateTicket } from "../utils/ticket.validator.js";
import { validateCreateTask } from "../utils/task.validator.js";
import { logActivity } from "../services/activity-log.service.js";

const TICKET_SELECT = `
	id, project_id, ticket_code, title, description, type, status, priority,
	due_date, resolution, closed_at, created_at, updated_at, source,
	created_via_api_key_id,
	assigned_to:profiles!tickets_assigned_to_fkey ( id, full_name, email ),
	created_by:profiles!tickets_created_by_fkey ( id, full_name, email )
`;

const TASK_SELECT = `
	id, project_id, board_column_id, ticket_id, title, description, status,
	priority, position, due_date, tags, created_at, updated_at, source,
	created_via_api_key_id,
	assigned_to:profiles!tasks_assigned_to_fkey ( id, full_name, email ),
	created_by:profiles!tasks_created_by_fkey ( id, full_name, email )
`;

const VALID_TICKET_STATUSES = ["open", "in_review", "resolved", "closed", "cancelled"];

async function ensureMemberOfProject(userId, projectId) {
	if (!userId) return false;
	const { data } = await supabaseAdmin
		.from("project_members")
		.select("user_id")
		.eq("project_id", projectId)
		.eq("user_id", userId)
		.maybeSingle();
	return !!data;
}

export async function createTicketExternal(req, res, next) {
	try {
		const { project_id: projectId, owner_user_id: ownerId, id: keyId } = req.apiKey;

		const errors = validateCreateTicket(req.body || {});
		if (errors.length) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { title, description, type, status, priority, assigned_to, due_date, ticket_code } = req.body;

		if (assigned_to) {
			const ok = await ensureMemberOfProject(assigned_to, projectId);
			if (!ok) {
				return res.status(400).json({
					success: false,
					message: "assigned_to user is not a member of this project.",
				});
			}
		}

		const { data: newId, error: rpcError } = await supabaseAdmin.rpc("create_ticket_atomic", {
			p_project_id: projectId,
			p_title: title.trim(),
			p_description: description?.trim() || null,
			p_type: type || "issue",
			p_status: status || "open",
			p_priority: priority || "medium",
			p_assigned_to: assigned_to || null,
			p_due_date: due_date || null,
			p_created_by: ownerId,
			p_ticket_code: ticket_code?.trim() ? ticket_code.trim().toUpperCase() : null,
		});

		if (rpcError) {
			if (rpcError.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "Ticket code already exists in this project.",
				});
			}
			throw rpcError;
		}

		await supabaseAdmin
			.from("tickets")
			.update({ source: "external_api", created_via_api_key_id: keyId })
			.eq("id", newId);

		const { data, error } = await supabaseAdmin
			.from("tickets")
			.select(TICKET_SELECT)
			.eq("id", newId)
			.single();
		if (error) throw error;

		logActivity({
			projectId,
			actorId: ownerId,
			entityType: "ticket",
			entityId: data.id,
			action: "ticket.created",
			metadata: {
				title: data.title,
				ticket_code: data.ticket_code,
				source: "external_api",
				api_key_id: keyId,
			},
		});

		res.status(201).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}

export async function getTicketExternal(req, res, next) {
	try {
		const { project_id: projectId } = req.apiKey;
		const { id } = req.params;

		const { data, error } = await supabaseAdmin
			.from("tickets")
			.select(TICKET_SELECT)
			.eq("id", id)
			.eq("project_id", projectId)
			.maybeSingle();
		if (error) throw error;
		if (!data) {
			return res.status(404).json({ success: false, message: "Ticket not found." });
		}
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}

export async function updateTicketStatusExternal(req, res, next) {
	try {
		const { project_id: projectId, owner_user_id: ownerId } = req.apiKey;
		const { id } = req.params;
		const { status, resolution } = req.body || {};

		if (!status || !VALID_TICKET_STATUSES.includes(status)) {
			return res.status(400).json({
				success: false,
				message: `status must be one of: ${VALID_TICKET_STATUSES.join(", ")}.`,
			});
		}

		const update = { status };
		if (status === "closed") {
			update.closed_at = new Date().toISOString();
			update.closed_by = ownerId;
			if (typeof resolution === "string") update.resolution = resolution.trim() || null;
		}

		const { data, error } = await supabaseAdmin
			.from("tickets")
			.update(update)
			.eq("id", id)
			.eq("project_id", projectId)
			.select(TICKET_SELECT)
			.maybeSingle();
		if (error) throw error;
		if (!data) return res.status(404).json({ success: false, message: "Ticket not found." });

		logActivity({
			projectId,
			actorId: ownerId,
			entityType: "ticket",
			entityId: data.id,
			action: "ticket.status_changed",
			metadata: { to: status, via: "external_api", api_key_id: req.apiKey.id },
		});

		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}

export async function createTaskExternal(req, res, next) {
	try {
		const { project_id: projectId, owner_user_id: ownerId, id: keyId } = req.apiKey;

		const errors = validateCreateTask(req.body || {});
		if (errors.length) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const {
			title,
			description,
			status,
			priority,
			assigned_to,
			board_column_id,
			due_date,
			tags,
			task_type_id,
		} = req.body;

		if (assigned_to) {
			const ok = await ensureMemberOfProject(assigned_to, projectId);
			if (!ok) {
				return res.status(400).json({
					success: false,
					message: "assigned_to user is not a member of this project.",
				});
			}
		}

		let positionQuery = supabaseAdmin
			.from("tasks")
			.select("position")
			.eq("project_id", projectId)
			.order("position", { ascending: false })
			.limit(1);
		if (board_column_id) positionQuery = positionQuery.eq("board_column_id", board_column_id);
		else positionQuery = positionQuery.is("board_column_id", null);
		const { data: lastTask } = await positionQuery.maybeSingle();
		const position = lastTask ? lastTask.position + 1 : 0;

		let resolvedStatus = status;
		if (!resolvedStatus) {
			const { data: firstStage } = await supabaseAdmin
				.from("workflow_stages")
				.select("key")
				.eq("project_id", projectId)
				.order("position", { ascending: true })
				.limit(1)
				.maybeSingle();
			resolvedStatus = firstStage?.key ?? "backlog";
		}

		let resolvedTaskTypeId = task_type_id || null;
		if (!resolvedTaskTypeId) {
			const { data: defaultType } = await supabaseAdmin
				.from("task_types")
				.select("id")
				.eq("is_default", true)
				.maybeSingle();
			resolvedTaskTypeId = defaultType?.id ?? null;
		}

		const { data, error } = await supabaseAdmin
			.from("tasks")
			.insert({
				project_id: projectId,
				board_column_id: board_column_id || null,
				title: title.trim(),
				description: description?.trim() || null,
				status: resolvedStatus,
				priority: priority || "medium",
				assigned_to: assigned_to || null,
				due_date: due_date || null,
				task_type_id: resolvedTaskTypeId,
				tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
				position,
				created_by: ownerId,
				source: "external_api",
				created_via_api_key_id: keyId,
			})
			.select(TASK_SELECT)
			.single();
		if (error) throw error;

		logActivity({
			projectId,
			actorId: ownerId,
			entityType: "task",
			entityId: data.id,
			action: "task.created",
			metadata: {
				title: data.title,
				source: "external_api",
				api_key_id: keyId,
			},
		});

		res.status(201).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}

export async function getTaskExternal(req, res, next) {
	try {
		const { project_id: projectId } = req.apiKey;
		const { id } = req.params;

		const { data, error } = await supabaseAdmin
			.from("tasks")
			.select(TASK_SELECT)
			.eq("id", id)
			.eq("project_id", projectId)
			.maybeSingle();
		if (error) throw error;
		if (!data) return res.status(404).json({ success: false, message: "Task not found." });
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}

export async function updateTaskStatusExternal(req, res, next) {
	try {
		const { project_id: projectId, owner_user_id: ownerId } = req.apiKey;
		const { id } = req.params;
		const { status } = req.body || {};

		if (!status || typeof status !== "string" || !/^[a-z][a-z0-9_-]*$/.test(status)) {
			return res.status(400).json({
				success: false,
				message: "status must be a valid workflow stage key (lowercase, digits, hyphens, underscores).",
			});
		}

		const { data, error } = await supabaseAdmin
			.from("tasks")
			.update({ status })
			.eq("id", id)
			.eq("project_id", projectId)
			.select(TASK_SELECT)
			.maybeSingle();
		if (error) throw error;
		if (!data) return res.status(404).json({ success: false, message: "Task not found." });

		logActivity({
			projectId,
			actorId: ownerId,
			entityType: "task",
			entityId: data.id,
			action: "task.status_changed",
			metadata: { to: status, via: "external_api", api_key_id: req.apiKey.id },
		});

		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
}
