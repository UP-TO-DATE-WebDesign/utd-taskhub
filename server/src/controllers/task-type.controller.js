import { supabase, supabaseAdmin } from "../config/supabase.js";
import {
	validateCreateTaskType,
	validateUpdateTaskType,
} from "../utils/task-type.validator.js";

const TASK_TYPE_SELECT =
	"id, key, name, description, color, icon, position, is_default, is_system, created_at, updated_at";

export async function listTaskTypes(req, res, next) {
	try {
		const { data, error } = await supabase
			.from("task_types")
			.select(TASK_TYPE_SELECT)
			.order("position", { ascending: true })
			.order("name", { ascending: true });

		if (error) throw error;

		res.status(200).json({
			success: true,
			count: data.length,
			data: { task_types: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function createTaskType(req, res, next) {
	try {
		const errors = validateCreateTaskType(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const payload = {
			key: req.body.key.trim(),
			name: req.body.name.trim(),
			description: req.body.description?.trim() || null,
			color: req.body.color ?? "#0058be",
			icon: req.body.icon ?? "circle-dot",
			position: req.body.position ?? 0,
			is_default: req.body.is_default ?? false,
			is_system: false,
		};

		if (payload.is_default) {
			const { error: clearError } = await supabaseAdmin
				.from("task_types")
				.update({ is_default: false })
				.eq("is_default", true);
			if (clearError) throw clearError;
		}

		const { data, error } = await supabaseAdmin
			.from("task_types")
			.insert(payload)
			.select(TASK_TYPE_SELECT)
			.single();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "A task type with this key already exists.",
				});
			}
			throw error;
		}

		res.status(201).json({
			success: true,
			message: "Task type created successfully.",
			data: { task_type: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function updateTaskType(req, res, next) {
	try {
		const errors = validateUpdateTaskType(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const updateData = {};
		if (req.body.name !== undefined) updateData.name = req.body.name.trim();
		if (req.body.description !== undefined) {
			updateData.description = req.body.description?.trim() || null;
		}
		if (req.body.color !== undefined) updateData.color = req.body.color;
		if (req.body.icon !== undefined) updateData.icon = req.body.icon;
		if (req.body.position !== undefined) updateData.position = req.body.position;
		if (req.body.is_default !== undefined) updateData.is_default = req.body.is_default;

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		if (updateData.is_default === true) {
			const { error: clearError } = await supabaseAdmin
				.from("task_types")
				.update({ is_default: false })
				.neq("id", req.params.id);
			if (clearError) throw clearError;
		}

		const { data, error } = await supabaseAdmin
			.from("task_types")
			.update(updateData)
			.eq("id", req.params.id)
			.select(TASK_TYPE_SELECT)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Task type not found.",
			});
		}

		res.status(200).json({
			success: true,
			message: "Task type updated successfully.",
			data: { task_type: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteTaskType(req, res, next) {
	try {
		const { data: existing, error: findError } = await supabaseAdmin
			.from("task_types")
			.select("id, is_system")
			.eq("id", req.params.id)
			.maybeSingle();

		if (findError) throw findError;

		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Task type not found.",
			});
		}

		if (existing.is_system) {
			return res.status(400).json({
				success: false,
				message: "System task types cannot be deleted.",
			});
		}

		const { error } = await supabaseAdmin
			.from("task_types")
			.delete()
			.eq("id", existing.id);

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Task type deleted successfully.",
		});
	} catch (error) {
		next(error);
	}
}
