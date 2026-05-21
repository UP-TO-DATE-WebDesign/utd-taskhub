import { supabase, supabaseAdmin } from "../config/supabase.js";
import {
	validateCreateWorkflowStage,
	validateUpdateWorkflowStage,
	slugifyKey,
} from "../utils/workflow-stage.validator.js";

const SELECT =
	"id, project_id, key, name, color, position, is_system, created_at, updated_at";

export async function listWorkflowStages(req, res, next) {
	try {
		const { projectId } = req.params;

		const { data, error } = await supabase
			.from("workflow_stages")
			.select(SELECT)
			.eq("project_id", projectId)
			.order("position", { ascending: true })
			.order("name", { ascending: true });

		if (error) throw error;

		res.status(200).json({
			success: true,
			count: data.length,
			data: { workflow_stages: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function createWorkflowStage(req, res, next) {
	try {
		const { projectId } = req.params;

		const errors = validateCreateWorkflowStage(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const name = req.body.name.trim();
		const baseKey = slugifyKey(name);
		let key = baseKey;

		const { data: existing, error: existingError } = await supabaseAdmin
			.from("workflow_stages")
			.select("key")
			.eq("project_id", projectId)
			.like("key", `${baseKey}%`);

		if (existingError) throw existingError;

		const taken = new Set((existing ?? []).map((r) => r.key));
		let suffix = 2;
		while (taken.has(key)) {
			key = `${baseKey}-${suffix}`;
			suffix += 1;
		}

		let position = req.body.position;
		if (position === undefined) {
			const { data: last, error: lastError } = await supabaseAdmin
				.from("workflow_stages")
				.select("position")
				.eq("project_id", projectId)
				.order("position", { ascending: false })
				.limit(1)
				.maybeSingle();
			if (lastError) throw lastError;
			position = (last?.position ?? -1) + 1;
		}

		const payload = {
			project_id: projectId,
			key,
			name,
			color: req.body.color ?? "#64748b",
			position,
			is_system: false,
		};

		const { data, error } = await supabaseAdmin
			.from("workflow_stages")
			.insert(payload)
			.select(SELECT)
			.single();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "A workflow stage with this key already exists.",
				});
			}
			throw error;
		}

		res.status(201).json({
			success: true,
			message: "Workflow stage created successfully.",
			data: { workflow_stage: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function updateWorkflowStage(req, res, next) {
	try {
		const { projectId, stageId } = req.params;

		const errors = validateUpdateWorkflowStage(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { data: existing, error: findError } = await supabaseAdmin
			.from("workflow_stages")
			.select("id, is_system, name")
			.eq("id", stageId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findError) throw findError;
		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Workflow stage not found.",
			});
		}

		const updateData = {};
		if (req.body.name !== undefined) {
			if (existing.is_system) {
				return res.status(400).json({
					success: false,
					message: "Default stage name cannot be modified.",
				});
			}
			updateData.name = req.body.name.trim();
		}
		if (req.body.color !== undefined) updateData.color = req.body.color;
		if (req.body.position !== undefined) updateData.position = req.body.position;

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		const { data, error } = await supabaseAdmin
			.from("workflow_stages")
			.update(updateData)
			.eq("id", stageId)
			.eq("project_id", projectId)
			.select(SELECT)
			.maybeSingle();

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Workflow stage updated successfully.",
			data: { workflow_stage: data },
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteWorkflowStage(req, res, next) {
	try {
		const { projectId, stageId } = req.params;

		const { data: existing, error: findError } = await supabaseAdmin
			.from("workflow_stages")
			.select("id, is_system")
			.eq("id", stageId)
			.eq("project_id", projectId)
			.maybeSingle();

		if (findError) throw findError;
		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Workflow stage not found.",
			});
		}

		if (existing.is_system) {
			return res.status(400).json({
				success: false,
				message: "Default workflow stages cannot be deleted.",
			});
		}

		const { error } = await supabaseAdmin
			.from("workflow_stages")
			.delete()
			.eq("id", existing.id);

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Workflow stage deleted successfully.",
		});
	} catch (error) {
		next(error);
	}
}
