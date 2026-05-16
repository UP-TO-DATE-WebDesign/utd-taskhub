import { supabase, supabaseAdmin } from "../config/supabase.js";
import {
	validateCreateTask,
	validateUpdateTask,
	validateMoveTask,
} from "../utils/task.validator.js";
import { refreshUserCapacity } from "../services/sprintCapacity.service.js";
import {
	createNotifications,
	NotificationType,
} from "../services/notification.service.js";
import { logActivity } from "../services/activity-log.service.js";

const TASK_SELECT = `
	id,
	project_id,
	board_column_id,
	ticket_id,
	title,
	description,
	developer_notes,
	status,
	priority,
	position,
	due_date,
	tags,
	created_at,
	updated_at,
	estimated_time,
	sprint_id,
	parent_task_id,
	sprint:sprints (
		id,
		name,
		status,
		start_date,
		end_date
	),
	assigned_to:profiles!tasks_assigned_to_fkey (
		id,
		full_name,
		email
	),
	created_by:profiles!tasks_created_by_fkey (
		id,
		full_name,
		email
	)
`;

export async function getTasks(req, res, next) {
	try {
		const { projectId } = req.params;
		const { column_id, status, priority, assigned_to } = req.query;

		let query = supabase
			.from("tasks")
			.select(TASK_SELECT)
			.eq("project_id", projectId)
			.order("position", { ascending: true });

		if (column_id) query = query.eq("board_column_id", column_id);
		if (status) query = query.eq("status", status);
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

export async function getTaskById(req, res, next) {
	try {
		const { projectId, taskId } = req.params;

		const { data, error } = await supabase
			.from("tasks")
			.select(TASK_SELECT)
			.eq("id", taskId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Task not found.",
			});
		}

		res.status(200).json({ success: true, data });
	} catch (error) {
		next(error);
	}
}

export async function createTask(req, res, next) {
	try {
		const { projectId } = req.params;

		const errors = validateCreateTask(req.body);
		if (errors.length > 0) {
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
			ticket_id,
			estimated_time,
			sprint_id,
			parent_task_id,
		} = req.body;

		if (parent_task_id) {
			const { data: parent, error: parentError } = await supabase
				.from("tasks")
				.select("id, project_id")
				.eq("id", parent_task_id)
				.maybeSingle();
			if (parentError) throw parentError;
			if (!parent || parent.project_id !== projectId) {
				return res.status(400).json({
					success: false,
					message: "parent_task_id must reference a task in the same project.",
				});
			}
		}

		// Derive position: place at end of the target column (or project-level if no column)
		let positionQuery = supabase
			.from("tasks")
			.select("position")
			.eq("project_id", projectId)
			.order("position", { ascending: false })
			.limit(1);

		if (board_column_id) {
			positionQuery = positionQuery.eq(
				"board_column_id",
				board_column_id,
			);
		} else {
			positionQuery = positionQuery.is("board_column_id", null);
		}

		const { data: lastTask } = await positionQuery.maybeSingle();
		const position = lastTask ? lastTask.position + 1 : 0;

		const { data, error } = await supabase
			.from("tasks")
			.insert({
				project_id: projectId,
				board_column_id: board_column_id || null,
				ticket_id: ticket_id || null,
				title: title.trim(),
				description: description?.trim() || null,
				status: status || "backlog",
				priority: priority || "medium",
				assigned_to: assigned_to || null,
				due_date: due_date || null,
				estimated_time: estimated_time || 0,
				sprint_id: sprint_id || null,
				parent_task_id: parent_task_id || null,
				tags: Array.isArray(tags)
					? tags.map((t) => t.trim()).filter(Boolean)
					: [],
				position,
				created_by: req.profile.id,
			})
			.select(TASK_SELECT)
			.single();

		if (error) throw error;

		// assigned_to is the joined profile object {id,...} due to TASK_SELECT
		if (data.sprint_id && data.assigned_to?.id) {
			try {
				await refreshUserCapacity(supabaseAdmin, data.assigned_to.id, data.sprint_id);
			} catch (e) {
				console.error("[capacity] createTask:", e.message);
			}
		}

		if (
			data.assigned_to?.id &&
			data.assigned_to.id !== req.profile.id
		) {
			createNotifications({
				userIds: [data.assigned_to.id],
				type: NotificationType.TASK_ASSIGNED,
				title: "New task assigned",
				body: data.title,
				data: { project_id: data.project_id, task_id: data.id },
			}).catch((e) => console.error("[notif]", e));
		}

		logActivity({
			projectId: data.project_id,
			actorId: req.profile.id,
			entityType: "task",
			entityId: data.id,
			action: "task.created",
			metadata: {
				title: data.title,
				status: data.status,
				priority: data.priority,
				assignee_id: data.assigned_to?.id ?? null,
				assignee_name: data.assigned_to?.full_name ?? null,
			},
		});

		res.status(201).json({
			success: true,
			message: "Task created successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function updateTask(req, res, next) {
	try {
		const { projectId, taskId } = req.params;

		const errors = validateUpdateTask(req.body);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const ALLOWED = [
			"title",
			"description",
			"developer_notes",
			"status",
			"priority",
			"assigned_to",
			"board_column_id",
			"due_date",
			"tags",
			"estimated_time",
			"sprint_id",
			"project_id",
			"parent_task_id",
		];
		const updateData = {};

		for (const field of ALLOWED) {
			if (req.body[field] !== undefined) {
				updateData[field] = req.body[field];
			}
		}

		if (updateData.title) updateData.title = updateData.title.trim();
		if (updateData.description)
			updateData.description = updateData.description.trim();
		if (
			updateData.developer_notes !== undefined &&
			updateData.developer_notes !== null
		) {
			updateData.developer_notes =
				updateData.developer_notes.trim() || null;
		}
		if (updateData.tags !== undefined) {
			updateData.tags = Array.isArray(updateData.tags)
				? updateData.tags.map((t) => t.trim()).filter(Boolean)
				: [];
		}
		if (updateData.estimated_time !== undefined) {
			const parsed = Number(updateData.estimated_time);
			updateData.estimated_time = isNaN(parsed) ? null : parsed;
		}

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		// Pre-fetch existing task so we can compute affected capacity pairs
		const { data: existing } = await supabase
			.from("tasks")
			.select("id, sprint_id, assigned_to, estimated_time")
			.eq("id", taskId)
			.eq("project_id", projectId)
			.maybeSingle();

		const { data, error } = await supabase
			.from("tasks")
			.update(updateData)
			.eq("id", taskId)
			.eq("project_id", projectId)
			.select(TASK_SELECT)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		// Recalculate capacity for all affected (userId, sprintId) pairs
		if (existing) {
			const oldAssignee = existing.assigned_to;
			const newAssignee =
				updateData.assigned_to !== undefined ? updateData.assigned_to : oldAssignee;
			const oldSprint = existing.sprint_id;
			const newSprint =
				updateData.sprint_id !== undefined ? updateData.sprint_id : oldSprint;

			const pairs = new Set();

			if (
				"assigned_to" in updateData &&
				updateData.assigned_to !== oldAssignee
			) {
				if (oldAssignee && newSprint) pairs.add(`${oldAssignee}:${newSprint}`);
				if (newAssignee && newSprint) pairs.add(`${newAssignee}:${newSprint}`);
			}

			if ("sprint_id" in updateData && updateData.sprint_id !== oldSprint) {
				if (newAssignee && oldSprint) pairs.add(`${newAssignee}:${oldSprint}`);
				if (newAssignee && newSprint) pairs.add(`${newAssignee}:${newSprint}`);
			}

			if ("estimated_time" in updateData && newAssignee && newSprint) {
				pairs.add(`${newAssignee}:${newSprint}`);
			}

			if (pairs.size > 0) {
				try {
					await Promise.all(
						[...pairs].map((pair) => {
							const [uid, sid] = pair.split(":");
							return refreshUserCapacity(supabaseAdmin, uid, sid);
						}),
					);
				} catch (e) {
					console.error("[capacity] updateTask:", e.message);
				}
			}

			const oldAssigneeId = existing.assigned_to;
			const newAssigneeId = data.assigned_to?.id ?? null;
			if (
				"assigned_to" in updateData &&
				newAssigneeId &&
				newAssigneeId !== oldAssigneeId &&
				newAssigneeId !== req.profile.id
			) {
				createNotifications({
					userIds: [newAssigneeId],
					type: NotificationType.TASK_ASSIGNED,
					title: "Task assigned to you",
					body: data.title,
					data: { project_id: data.project_id, task_id: data.id },
				}).catch((e) => console.error("[notif]", e));
			}
		}

		const statusChanged =
			"status" in updateData &&
			existing &&
			updateData.status !== existing.status;

		logActivity({
			projectId: data.project_id,
			actorId: req.profile.id,
			entityType: "task",
			entityId: data.id,
			action: statusChanged ? "task.status_changed" : "task.updated",
			metadata: {
				title: data.title,
				changed_fields: Object.keys(updateData),
				...(statusChanged
					? { from: existing.status, to: updateData.status }
					: {}),
			},
		});

		res.status(200).json({
			success: true,
			message: "Task updated successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteTask(req, res, next) {
	try {
		const { projectId, taskId } = req.params;

		const { data: existing, error: findError } = await supabase
			.from("tasks")
			.select("id, title, sprint_id, assigned_to")
			.eq("id", taskId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findError) throw findError;

		if (!existing) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const { error } = await supabase.rpc("delete_with_trash", {
			table_name: "tasks",
			record_id: taskId,
			deleter: req.profile.id,
		});
		if (error) throw error;

		if (existing.sprint_id && existing.assigned_to) {
			try {
				await refreshUserCapacity(supabaseAdmin, existing.assigned_to, existing.sprint_id);
			} catch (e) {
				console.error("[capacity] deleteTask:", e.message);
			}
		}

		logActivity({
			projectId,
			actorId: req.profile.id,
			entityType: "task",
			entityId: taskId,
			action: "task.deleted",
			metadata: { title: existing.title },
		});

		res.status(200).json({
			success: true,
			message: "Task deleted successfully.",
		});
	} catch (error) {
		next(error);
	}
}

export async function moveTask(req, res, next) {
	try {
		const { projectId, taskId } = req.params;

		const errors = validateMoveTask(req.body);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { board_column_id, position } = req.body;

		// Verify the task belongs to this project
		const { data: task, error: findError } = await supabase
			.from("tasks")
			.select("id, board_column_id, position")
			.eq("id", taskId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findError) throw findError;

		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		// Verify the target column belongs to a board in this project
		const { data: column, error: columnError } = await supabase
			.from("board_columns")
			.select("id, board_id, boards!inner(project_id)")
			.eq("id", board_column_id)
			.maybeSingle();

		if (columnError) throw columnError;

		if (!column || column.boards.project_id !== projectId) {
			return res.status(400).json({
				success: false,
				message: "board_column_id does not belong to this project.",
			});
		}

		// Fetch all tasks in the destination column (excluding the moving task), ordered by position
		const { data: columnTasks, error: tasksError } = await supabase
			.from("tasks")
			.select("id, position")
			.eq("board_column_id", board_column_id)
			.neq("id", taskId)
			.order("position", { ascending: true });

		if (tasksError) throw tasksError;

		// Clamp position to valid range
		const clampedPosition = Math.min(position, columnTasks.length);

		// Build new ordered list by splicing the task into the desired position
		columnTasks.splice(clampedPosition, 0, { id: taskId });

		// Build position updates for tasks whose position changed
		const updates = columnTasks
			.map((t, idx) => ({ id: t.id, position: idx }))
			.filter((t) => t.id !== taskId || true); // include all; we'll batch update

		// Update all affected tasks' positions and the moving task's column
		const positionUpdates = updates
			.filter((t) => t.id !== taskId)
			.map((t) =>
				supabase
					.from("tasks")
					.update({ position: t.position })
					.eq("id", t.id),
			);

		const movingTaskPosition = updates.find(
			(t) => t.id === taskId,
		).position;

		await Promise.all([
			...positionUpdates,
			supabase
				.from("tasks")
				.update({ board_column_id, position: movingTaskPosition })
				.eq("id", taskId),
		]);

		// Fetch and return the updated task
		const { data, error } = await supabase
			.from("tasks")
			.select(TASK_SELECT)
			.eq("id", taskId)
			.single();

		if (error) throw error;

		logActivity({
			projectId,
			actorId: req.profile.id,
			entityType: "task",
			entityId: data.id,
			action: "task.moved",
			metadata: {
				title: data.title,
				from_column_id: task.board_column_id,
				to_column_id: board_column_id,
			},
		});

		res.status(200).json({
			success: true,
			message: "Task moved successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function getAllTasks(req, res, next) {
	try {
		const { project_id, status, priority, assigned_to, search } = req.query;

		let query = supabase
			.from("tasks")
			.select(TASK_SELECT)
			.order("created_at", { ascending: false });

		if (project_id) query = query.eq("project_id", project_id);
		if (status) query = query.eq("status", status);
		if (priority) query = query.eq("priority", priority);
		if (assigned_to) query = query.eq("assigned_to", assigned_to);
		if (search) query = query.ilike("title", `%${search}%`);

		const { data, error } = await query;
		if (error) throw error;

		res.status(200).json({ success: true, count: data.length, data });
	} catch (error) {
		next(error);
	}
}
