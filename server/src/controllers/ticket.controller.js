import { supabase } from "../config/supabase.js";
import {
	validateCreateTicket,
	validateUpdateTicket,
	validateCloseTicket,
	validateTicketCode,
} from "../utils/ticket.validator.js";
import { validateCreateTask } from "../utils/task.validator.js";
import { notifyTicketClosed } from "../services/ticket-notify.service.js";
import { generateTicketCode } from "../utils/ticket-code.helper.js";

const TICKET_SELECT = `
	id,
	project_id,
	converted_task_id,
	ticket_code,
	title,
	description,
	type,
	status,
	priority,
	due_date,
	resolution,
	closed_at,
	created_at,
	updated_at,
	assigned_to:profiles!tickets_assigned_to_fkey (
		id,
		full_name,
		email
	),
	created_by:profiles!tickets_created_by_fkey (
		id,
		full_name,
		email
	),
	closed_by:profiles!tickets_closed_by_fkey (
		id,
		full_name,
		email
	)
`;

export async function getTickets(req, res, next) {
	try {
		const { projectId } = req.params;
		const { status, type, priority, assigned_to } = req.query;

		let query = supabase
			.from("tickets")
			.select(TICKET_SELECT)
			.eq("project_id", projectId)
			.order("created_at", { ascending: false });

		if (status) query = query.eq("status", status);
		if (type) query = query.eq("type", type);
		if (priority) query = query.eq("priority", priority);
		if (assigned_to) query = query.eq("assigned_to", assigned_to);

		const { data, error } = await query;
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

export async function getTicketById(req, res, next) {
	try {
		const { projectId, ticketId } = req.params;

		const { data, error } = await supabase
			.from("tickets")
			.select(TICKET_SELECT)
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		res.status(200).json({
			success: true,
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function createTicket(req, res, next) {
	try {
		const { projectId } = req.params;

		const errors = validateCreateTicket(req.body);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { title, description, type, status, priority, assigned_to, due_date, ticket_code } = req.body;

		const { data: newId, error: rpcError } = await supabase.rpc("create_ticket_atomic", {
			p_project_id: projectId,
			p_title: title.trim(),
			p_description: description?.trim() || null,
			p_type: type || "issue",
			p_status: status || "open",
			p_priority: priority || "medium",
			p_assigned_to: assigned_to || null,
			p_due_date: due_date || null,
			p_created_by: req.profile.id,
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

		const { data, error } = await supabase
			.from("tickets")
			.select(TICKET_SELECT)
			.eq("id", newId)
			.single();

		if (error) throw error;

		res.status(201).json({
			success: true,
			message: "Ticket created successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function updateTicket(req, res, next) {
	try {
		const { projectId, ticketId } = req.params;

		const errors = validateUpdateTicket(req.body);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const updateData = {};

		if (req.body.title !== undefined) updateData.title = req.body.title.trim();
		if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
		if (req.body.type !== undefined) updateData.type = req.body.type;
		if (req.body.status !== undefined) updateData.status = req.body.status;
		if (req.body.priority !== undefined) updateData.priority = req.body.priority;
		if (req.body.assigned_to !== undefined) updateData.assigned_to = req.body.assigned_to || null;
		if (req.body.due_date !== undefined) updateData.due_date = req.body.due_date || null;
		if (req.body.ticket_code !== undefined) updateData.ticket_code = req.body.ticket_code?.trim().toUpperCase() || null;

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		const { data: existing } = await supabase
			.from("tickets")
			.select("id, status")
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.maybeSingle();

		const { data, error } = await supabase
			.from("tickets")
			.update(updateData)
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.select(TICKET_SELECT)
			.maybeSingle();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "Ticket code already exists in this project.",
				});
			}
			throw error;
		}

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		if (
			existing &&
			existing.status !== "closed" &&
			updateData.status === "closed"
		) {
			notifyTicketClosed({
				projectId,
				ticket: data,
				actorId: req.profile.id,
			}).catch((e) => console.error("[notif]", e));
		}

		res.status(200).json({
			success: true,
			message: "Ticket updated successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function closeTicket(req, res, next) {
	try {
		const { projectId, ticketId } = req.params;

		const errors = validateCloseTicket(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { data: existing, error: findErr } = await supabase
			.from("tickets")
			.select("id, status")
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findErr) throw findErr;

		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		if (existing.status === "closed") {
			return res.status(409).json({
				success: false,
				message: "Ticket is already closed.",
			});
		}

		const updateData = {
			status: "closed",
			closed_at: new Date().toISOString(),
			closed_by: req.profile.id,
		};
		if (req.body?.resolution !== undefined) {
			const trimmed =
				typeof req.body.resolution === "string"
					? req.body.resolution.trim()
					: "";
			updateData.resolution = trimmed || null;
		}

		const { data, error } = await supabase
			.from("tickets")
			.update(updateData)
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.select(TICKET_SELECT)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		notifyTicketClosed({
			projectId,
			ticket: data,
			actorId: req.profile.id,
		}).catch((e) => console.error("[notif]", e));

		res.status(200).json({
			success: true,
			message: "Ticket closed.",
			data,
		});
	} catch (err) {
		next(err);
	}
}

export async function deleteTicket(req, res, next) {
	try {
		const { projectId, ticketId } = req.params;

		const { data: existing, error: findError } = await supabase
			.from("tickets")
			.select("id")
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findError) throw findError;

		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		const { error } = await supabase.rpc("delete_with_trash", {
			table_name: "tickets",
			record_id: ticketId,
			deleter: req.profile.id,
		});

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Ticket deleted successfully.",
		});
	} catch (error) {
		next(error);
	}
}

export async function convertTicketToTask(req, res, next) {
	try {
		const { projectId, ticketId } = req.params;

		const { data: ticket, error: ticketError } = await supabase
			.from("tickets")
			.select("id, title, description, priority, assigned_to, due_date, converted_task_id, status")
			.eq("id", ticketId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (ticketError) throw ticketError;

		if (!ticket) {
			return res.status(404).json({
				success: false,
				message: "Ticket not found.",
			});
		}

		if (ticket.converted_task_id) {
			return res.status(409).json({
				success: false,
				message: "Ticket has already been converted to a task.",
				converted_task_id: ticket.converted_task_id,
			});
		}

		// Merge ticket defaults with any manager overrides from the request body
		const payload = {
			title: req.body.title ?? ticket.title,
			description: req.body.description ?? ticket.description ?? null,
			priority: req.body.priority ?? ticket.priority,
			assigned_to: req.body.assigned_to ?? ticket.assigned_to ?? null,
			due_date: req.body.due_date ?? ticket.due_date ?? null,
			status: req.body.status ?? "backlog",
			board_column_id: req.body.board_column_id ?? null,
			tags: req.body.tags ?? [],
		};

		const errors = validateCreateTask(payload);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		// Derive position at end of target column (or project root if no column)
		let positionQuery = supabase
			.from("tasks")
			.select("position")
			.eq("project_id", projectId)
			.order("position", { ascending: false })
			.limit(1);

		if (payload.board_column_id) {
			positionQuery = positionQuery.eq("board_column_id", payload.board_column_id);
		} else {
			positionQuery = positionQuery.is("board_column_id", null);
		}

		const { data: lastTask } = await positionQuery.maybeSingle();
		const position = lastTask ? lastTask.position + 1 : 0;

		const { data: task, error: taskError } = await supabase
			.from("tasks")
			.insert({
				project_id: projectId,
				ticket_id: ticket.id,
				board_column_id: payload.board_column_id,
				title: payload.title.trim(),
				description: payload.description?.trim() || null,
				priority: payload.priority,
				assigned_to: payload.assigned_to,
				due_date: payload.due_date,
				status: payload.status,
				tags: payload.tags.map(t => t.trim()).filter(Boolean),
				created_by: req.profile.id,
				position,
			})
			.select(`
				id,
				project_id,
				board_column_id,
				ticket_id,
				title,
				description,
				status,
				priority,
				position,
				due_date,
				tags,
				created_at,
				updated_at,
				assigned_to:profiles!tasks_assigned_to_fkey (id, full_name, email),
				created_by:profiles!tasks_created_by_fkey (id, full_name, email)
			`)
			.single();

		if (taskError) throw taskError;

		const { data: updatedTicket, error: updateError } = await supabase
			.from("tickets")
			.update({
				converted_task_id: task.id,
				status: "resolved",
			})
			.eq("id", ticketId)
			.select(TICKET_SELECT)
			.single();

		if (updateError) throw updateError;

		res.status(201).json({
			success: true,
			message: "Ticket converted to task successfully.",
			data: {
				ticket: updatedTicket,
				task,
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function checkTicketCode(req, res, next) {
	try {
		const { projectId } = req.params;
		const { code, excludeId } = req.query;

		if (!code) {
			return res.status(400).json({
				success: false,
				message: "code query param is required.",
			});
		}

		const normalized = String(code).trim().toUpperCase();
		const formatError = validateTicketCode(normalized);
		if (formatError) {
			return res.status(200).json({
				success: true,
				data: { available: false, reason: formatError },
			});
		}

		let query = supabase
			.from("tickets")
			.select("id")
			.eq("project_id", projectId)
			.eq("ticket_code", normalized)
			.limit(1);

		if (excludeId) query = query.neq("id", excludeId);

		const { data, error } = await query;
		if (error) throw error;

		res.status(200).json({
			success: true,
			data: { available: (data?.length ?? 0) === 0 },
		});
	} catch (error) {
		next(error);
	}
}

export async function getNextTicketCode(req, res, next) {
	try {
		const { projectId } = req.params;
		const code = await generateTicketCode(supabase, projectId);
		res.status(200).json({
			success: true,
			data: { ticket_code: code },
		});
	} catch (error) {
		next(error);
	}
}
