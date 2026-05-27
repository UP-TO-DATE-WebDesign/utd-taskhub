import { supabaseAdmin } from "../config/supabase.js";
import {
	listTimeLogsForTask,
	getTimeLogById,
	createTimeLog,
	updateTimeLog,
	deleteTimeLog,
} from "../services/timeLog.service.js";
import {
	validateCreateTimeLog,
	validateUpdateTimeLog,
} from "../utils/timeLog.validator.js";

async function fetchTaskForLog(projectId, taskId) {
	const { data, error } = await supabaseAdmin
		.from("tasks")
		.select("id, project_id, assigned_to, sprint_id")
		.eq("id", taskId)
		.eq("project_id", projectId)
		.maybeSingle();
	if (error) throw error;
	return data;
}

function isAdminOrManager(profile) {
	if (!profile) return false;
	if (profile.role === "admin" || profile.role === "manager") return true;
	const globalKey = profile.global_role?.key;
	return globalKey === "admin" || globalKey === "manager";
}

function canManageTimeLogs(profile, task) {
	if (!profile || !task) return false;
	if (task.assigned_to === profile.id) return true;
	return isAdminOrManager(profile);
}

function canEditOwnLog(profile, log) {
	if (!profile || !log) return false;
	if (log.logged_by?.id === profile.id || log.user_id === profile.id) return true;
	return isAdminOrManager(profile);
}

export async function listTimeLogs(req, res, next) {
	try {
		const { projectId, taskId } = req.params;
		const task = await fetchTaskForLog(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const data = await listTimeLogsForTask(supabaseAdmin, taskId);
		res.status(200).json({ success: true, count: data.length, data });
	} catch (error) {
		next(error);
	}
}

export async function createTimeLogHandler(req, res, next) {
	try {
		const { projectId, taskId } = req.params;
		const task = await fetchTaskForLog(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		if (!task.assigned_to) {
			return res.status(400).json({
				success: false,
				message: "Task must have an assignee before logging time.",
			});
		}

		if (!canManageTimeLogs(req.profile, task)) {
			return res.status(403).json({
				success: false,
				message:
					"Only the assignee or an admin/manager can log time on this task.",
			});
		}

		const errors = validateCreateTimeLog(req.body);
		if (errors.length > 0) {
			return res
				.status(400)
				.json({ success: false, message: "Validation failed.", errors });
		}

		const data = await createTimeLog(supabaseAdmin, {
			taskId,
			userId: task.assigned_to,
			loggedBy: req.profile.id,
			sprintId: task.sprint_id,
			durationMinutes: req.body.duration_minutes,
			description: req.body.description,
			loggedDate: req.body.logged_date,
		});

		res.status(201).json({ success: true, data });
	} catch (error) {
		next(error);
	}
}

export async function updateTimeLogHandler(req, res, next) {
	try {
		const { projectId, taskId, logId } = req.params;
		const task = await fetchTaskForLog(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const existing = await getTimeLogById(supabaseAdmin, logId);
		if (!existing || existing.task_id !== taskId) {
			return res
				.status(404)
				.json({ success: false, message: "Time log not found." });
		}

		if (!canEditOwnLog(req.profile, existing)) {
			return res.status(403).json({
				success: false,
				message: "You cannot edit this time log.",
			});
		}

		const errors = validateUpdateTimeLog(req.body);
		if (errors.length > 0) {
			return res
				.status(400)
				.json({ success: false, message: "Validation failed.", errors });
		}

		const data = await updateTimeLog(supabaseAdmin, logId, {
			durationMinutes: req.body.duration_minutes,
			description: req.body.description,
			loggedDate: req.body.logged_date,
		});

		res.status(200).json({ success: true, data });
	} catch (error) {
		next(error);
	}
}

export async function deleteTimeLogHandler(req, res, next) {
	try {
		const { projectId, taskId, logId } = req.params;
		const task = await fetchTaskForLog(projectId, taskId);
		if (!task) {
			return res
				.status(404)
				.json({ success: false, message: "Task not found." });
		}

		const existing = await getTimeLogById(supabaseAdmin, logId);
		if (!existing || existing.task_id !== taskId) {
			return res
				.status(404)
				.json({ success: false, message: "Time log not found." });
		}

		if (!canEditOwnLog(req.profile, existing)) {
			return res.status(403).json({
				success: false,
				message: "You cannot delete this time log.",
			});
		}

		await deleteTimeLog(supabaseAdmin, logId);
		res.status(200).json({ success: true, message: "Time log deleted." });
	} catch (error) {
		next(error);
	}
}
