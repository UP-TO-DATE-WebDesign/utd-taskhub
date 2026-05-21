import { supabase, supabaseAdmin } from "../config/supabase.js";
import {
	validateCreateSprint,
	validateUpdateSprint,
	computeEndDate,
} from "../utils/sprint.validator.js";
import {
	createNotifications,
	NotificationType,
} from "../services/notification.service.js";
import { notifyTicketClosed } from "../services/ticket-notify.service.js";

async function getActiveProfileIds(excludeId) {
	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("id")
		.eq("status", "active");
	if (error) {
		console.error("[notif] sprint recipients:", error.message);
		return [];
	}
	return (data ?? [])
		.map((p) => p.id)
		.filter((id) => id !== excludeId);
}

const SPRINT_SELECT = `
	id,
	name,
	start_date,
	end_date,
	status,
	created_at,
	updated_at,
	created_by:profiles!sprints_created_by_fkey (
		id,
		full_name,
		email
	)
`;

export async function listSprints(req, res, next) {
	try {
		const { data, error } = await supabase
			.from("sprints")
			.select(SPRINT_SELECT)
			.order("start_date", { ascending: true });

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

export async function createSprint(req, res, next) {
	try {
		const { name, start_date, end_date, status } = req.body;

		const errors = validateCreateSprint({ name, start_date, end_date, status });
		if (errors.length > 0) {
			return res.status(400).json({ success: false, message: "Validation failed.", errors });
		}

		const resolvedEndDate = end_date || computeEndDate(start_date);

		const { data, error } = await supabase
			.from("sprints")
			.insert({
				name: name.trim(),
				start_date,
				end_date: resolvedEndDate,
				status: status || "planned",
				created_by: req.profile.id,
			})
			.select(SPRINT_SELECT)
			.single();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "A sprint already exists for that week.",
				});
			}
			throw error;
		}

		res.status(201).json({
			success: true,
			message: "Sprint created.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function updateSprint(req, res, next) {
	try {
		const { sprintId } = req.params;
		const { name, start_date, end_date, status } = req.body;

		const errors = validateUpdateSprint({ name, start_date, end_date, status });
		if (errors.length > 0) {
			return res.status(400).json({ success: false, message: "Validation failed.", errors });
		}

		const updates = {};
		if (name !== undefined) updates.name = name.trim();
		if (start_date !== undefined) {
			updates.start_date = start_date;
			updates.end_date = end_date || computeEndDate(start_date);
		}
		if (status !== undefined) updates.status = status;

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ success: false, message: "No fields to update." });
		}

		const { data: existing } = await supabase
			.from("sprints")
			.select("id, status")
			.eq("id", sprintId)
			.maybeSingle();

		const { data, error } = await supabase
			.from("sprints")
			.update(updates)
			.eq("id", sprintId)
			.select(SPRINT_SELECT)
			.maybeSingle();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "A sprint already exists for that week.",
				});
			}
			throw error;
		}

		if (!data) {
			return res.status(404).json({ success: false, message: "Sprint not found." });
		}

		if (
			existing &&
			existing.status !== "active" &&
			updates.status === "active"
		) {
			getActiveProfileIds(req.profile.id)
				.then((ids) =>
					createNotifications({
						userIds: ids,
						type: NotificationType.SPRINT_STARTED,
						title: "Sprint started",
						body: data.name,
						data: { sprint_id: data.id },
					}),
				)
				.catch((e) => console.error("[notif]", e));
		}

		res.status(200).json({ success: true, message: "Sprint updated.", data });
	} catch (error) {
		next(error);
	}
}

const VALID_END_ACTIONS = ["keep", "backlog", "move", "close_ticket"];
const VALID_MOVE_STATUSES = ["backlog", "todo", "in-progress", "qa", "done"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateEndSprintPayload(taskActions) {
	const errors = [];
	if (!Array.isArray(taskActions)) {
		errors.push("taskActions must be an array.");
		return errors;
	}
	taskActions.forEach((entry, idx) => {
		if (!entry || typeof entry !== "object") {
			errors.push(`taskActions[${idx}] must be an object.`);
			return;
		}
		if (!entry.taskId || !UUID_RE.test(entry.taskId)) {
			errors.push(`taskActions[${idx}].taskId must be a valid UUID.`);
		}
		if (!VALID_END_ACTIONS.includes(entry.action)) {
			errors.push(
				`taskActions[${idx}].action must be one of: ${VALID_END_ACTIONS.join(", ")}.`,
			);
		}
		if (entry.action === "move") {
			if (!VALID_MOVE_STATUSES.includes(entry.targetStatus)) {
				errors.push(
					`taskActions[${idx}].targetStatus must be one of: ${VALID_MOVE_STATUSES.join(", ")}.`,
				);
			}
		}
	});
	return errors;
}

export async function endSprint(req, res, next) {
	try {
		const roleKey = req.profile?.global_role?.key ?? req.profile?.role;
		if (roleKey !== "admin" && roleKey !== "manager") {
			return res.status(403).json({
				success: false,
				message: "Only admins and managers can end a sprint.",
			});
		}

		const { sprintId } = req.params;
		const { taskActions } = req.body ?? {};

		const errors = validateEndSprintPayload(taskActions);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { data: sprint, error: sprintErr } = await supabase
			.from("sprints")
			.select("id, status")
			.eq("id", sprintId)
			.maybeSingle();

		if (sprintErr) throw sprintErr;
		if (!sprint) {
			return res.status(404).json({ success: false, message: "Sprint not found." });
		}
		if (sprint.status !== "active") {
			return res.status(400).json({
				success: false,
				message: "Only active sprints can be ended.",
			});
		}

		const { data: sprintTasks, error: tasksErr } = await supabase
			.from("tasks")
			.select("id, status, ticket_id, project_id")
			.eq("sprint_id", sprintId);

		if (tasksErr) throw tasksErr;

		const actionsByTaskId = new Map();
		for (const entry of taskActions) {
			actionsByTaskId.set(entry.taskId, entry);
		}

		const validTaskIds = new Set(sprintTasks.map((t) => t.id));
		for (const entry of taskActions) {
			if (!validTaskIds.has(entry.taskId)) {
				return res.status(400).json({
					success: false,
					message: `Task ${entry.taskId} is not part of this sprint.`,
				});
			}
			if (entry.action === "close_ticket") {
				const task = sprintTasks.find((t) => t.id === entry.taskId);
				if (!task || task.status !== "done" || !task.ticket_id) {
					return res.status(400).json({
						success: false,
						message: `close_ticket is only allowed for done tasks that have a linked ticket (taskId=${entry.taskId}).`,
					});
				}
			}
		}

		const updatedTaskIds = [];
		const closedTicketIds = [];
		for (const task of sprintTasks) {
			const isDone = task.status === "done";
			const action = actionsByTaskId.get(task.id) ?? { action: "keep" };

			if (action.action === "close_ticket") {
				if (!task.ticket_id) continue;

				const { data: ticket, error: tFindErr } = await supabase
					.from("tickets")
					.select("id, project_id, title, status, resolution")
					.eq("id", task.ticket_id)
					.maybeSingle();
				if (tFindErr) throw tFindErr;
				if (!ticket || ticket.status === "closed") continue;

				const { data: closed, error: tUpdErr } = await supabase
					.from("tickets")
					.update({
						status: "closed",
						closed_at: new Date().toISOString(),
						closed_by: req.profile.id,
					})
					.eq("id", ticket.id)
					.select("id, project_id, title, resolution")
					.maybeSingle();
				if (tUpdErr) throw tUpdErr;

				if (closed) {
					closedTicketIds.push(closed.id);
					notifyTicketClosed({
						projectId: closed.project_id,
						ticket: closed,
						actorId: req.profile.id,
					}).catch((e) => console.error("[notif]", e));
				}
				continue;
			}

			let updates = null;
			if (action.action === "backlog") {
				updates = { status: "backlog", sprint_id: null };
			} else if (action.action === "move") {
				updates = isDone
					? { status: action.targetStatus }
					: { status: action.targetStatus, sprint_id: null };
			}

			if (!updates) continue;

			const { error: updErr } = await supabase
				.from("tasks")
				.update(updates)
				.eq("id", task.id);

			if (updErr) throw updErr;
			updatedTaskIds.push(task.id);
		}

		const { data: updatedSprint, error: closeErr } = await supabase
			.from("sprints")
			.update({ status: "completed" })
			.eq("id", sprintId)
			.select(SPRINT_SELECT)
			.maybeSingle();

		if (closeErr) throw closeErr;

		getActiveProfileIds(req.profile.id)
			.then((ids) =>
				createNotifications({
					userIds: ids,
					type: NotificationType.SPRINT_ENDED,
					title: "Sprint ended",
					body: updatedSprint?.name ?? "Sprint ended",
					data: { sprint_id: sprintId },
				}),
			)
			.catch((e) => console.error("[notif]", e));

		res.status(200).json({
			success: true,
			message: "Sprint ended.",
			data: { sprint: updatedSprint, updatedTaskIds, closedTicketIds },
		});
	} catch (error) {
		next(error);
	}
}

const VALID_START_ACTIONS = ["move", "keep"];

function validateStartSprintPayload(taskActions) {
	const errors = [];
	if (!Array.isArray(taskActions)) {
		errors.push("taskActions must be an array.");
		return errors;
	}
	taskActions.forEach((entry, idx) => {
		if (!entry || typeof entry !== "object") {
			errors.push(`taskActions[${idx}] must be an object.`);
			return;
		}
		if (!entry.taskId || !UUID_RE.test(entry.taskId)) {
			errors.push(`taskActions[${idx}].taskId must be a valid UUID.`);
		}
		if (!VALID_START_ACTIONS.includes(entry.action)) {
			errors.push(
				`taskActions[${idx}].action must be one of: ${VALID_START_ACTIONS.join(", ")}.`,
			);
		}
	});
	return errors;
}

export async function startSprint(req, res, next) {
	try {
		const roleKey = req.profile?.global_role?.key ?? req.profile?.role;
		if (roleKey !== "admin" && roleKey !== "manager") {
			return res.status(403).json({
				success: false,
				message: "Only admins and managers can start a sprint.",
			});
		}

		const { sprintId } = req.params;
		const { taskActions = [] } = req.body ?? {};

		const errors = validateStartSprintPayload(taskActions);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { data: sprint, error: sprintErr } = await supabase
			.from("sprints")
			.select("id, status")
			.eq("id", sprintId)
			.maybeSingle();

		if (sprintErr) throw sprintErr;
		if (!sprint) {
			return res
				.status(404)
				.json({ success: false, message: "Sprint not found." });
		}
		if (sprint.status !== "planned") {
			return res.status(400).json({
				success: false,
				message: "Only planned sprints can be started.",
			});
		}

		const { data: existingActive, error: actErr } = await supabase
			.from("sprints")
			.select("id")
			.eq("status", "active")
			.maybeSingle();
		if (actErr) throw actErr;
		if (existingActive) {
			return res.status(400).json({
				success: false,
				message: "Another sprint is already active.",
			});
		}

		const moveIds = taskActions
			.filter((a) => a.action === "move")
			.map((a) => a.taskId);

		const updatedTaskIds = [];
		if (moveIds.length > 0) {
			const { data: validTasks, error: vErr } = await supabase
				.from("tasks")
				.select("id")
				.in("id", moveIds);
			if (vErr) throw vErr;
			const validSet = new Set((validTasks ?? []).map((t) => t.id));
			for (const taskId of moveIds) {
				if (!validSet.has(taskId)) {
					return res.status(400).json({
						success: false,
						message: `Task ${taskId} not found.`,
					});
				}
			}

			const { error: updErr } = await supabase
				.from("tasks")
				.update({ sprint_id: sprintId })
				.in("id", moveIds);
			if (updErr) throw updErr;
			updatedTaskIds.push(...moveIds);
		}

		const { data: updatedSprint, error: startErr } = await supabase
			.from("sprints")
			.update({ status: "active" })
			.eq("id", sprintId)
			.select(SPRINT_SELECT)
			.maybeSingle();

		if (startErr) throw startErr;

		getActiveProfileIds(req.profile.id)
			.then((ids) =>
				createNotifications({
					userIds: ids,
					type: NotificationType.SPRINT_STARTED,
					title: "Sprint started",
					body: updatedSprint?.name ?? "Sprint started",
					data: { sprint_id: sprintId },
				}),
			)
			.catch((e) => console.error("[notif]", e));

		res.status(200).json({
			success: true,
			message: "Sprint started.",
			data: { sprint: updatedSprint, updatedTaskIds },
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteSprint(req, res, next) {
	try {
		const { sprintId } = req.params;

		const { data: deleted, error } = await supabase.rpc("delete_with_trash", {
			table_name: "sprints",
			record_id: sprintId,
			deleter: req.profile.id,
		});

		if (error) throw error;

		if (!deleted) {
			return res.status(404).json({ success: false, message: "Sprint not found." });
		}

		res.status(200).json({ success: true, message: "Sprint deleted." });
	} catch (error) {
		next(error);
	}
}
