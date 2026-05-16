import { supabase } from "../config/supabase.js";
import {
	validateCreateProject,
	validateUpdateProject,
} from "../utils/project.validator.js";
import { generateUniqueProjectKey } from "../utils/ticket-code.helper.js";
import { logActivity } from "../services/activity-log.service.js";

export async function getProjects(req, res, next) {
	try {
		const { status, search, sprint_id } = req.query;

		let query = supabase
			.from("projects")
			.select(
				"*, project_members(user_id, role, joined_at, profiles(id, full_name, email, avatar_url)), tasks(id, status), sprint:sprints!projects_sprint_id_fkey(id, name, start_date, end_date, status)",
			)
			.order("created_at", { ascending: false });

		if (req.profile?.global_role?.key !== "admin") {
			const { data: memberships, error: memberError } =
				await req.supabaseAdmin
					.from("project_members")
					.select("project_id")
					.eq("user_id", req.profile.id);

			if (memberError) throw memberError;

			const projectIds = memberships?.map((m) => m.project_id) ?? [];
			query = query.in("id", projectIds);
		}

		if (status) query = query.eq("status", status);
		if (search) query = query.ilike("name", `%${search}%`);
		if (sprint_id) query = query.eq("sprint_id", sprint_id);

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

export async function getProjectById(req, res, next) {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("projects")
			.select(
				"*, project_members(user_id, role, joined_at, profiles(id, full_name, email, avatar_url)), sprint:sprints!projects_sprint_id_fkey(id, name, start_date, end_date, status)",
			)
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Project not found.",
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

export async function createProject(req, res, next) {
	try {
		const errors = validateCreateProject(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const {
			name,
			description,
			status,
			icon_type,
			icon_value,
			sprint_name,
			sprint_end_date,
			sprint_id,
			tags,
			key,
		} = req.body;

		const projectKey = key?.trim()
			? key.trim().toUpperCase()
			: await generateUniqueProjectKey(supabase, name);

		const { data, error } = await supabase
			.from("projects")
			.insert({
				name: name.trim(),
				description: description?.trim() || null,
				status: status || "planning",
				icon_type: icon_type || "icon",
				icon_value: icon_value?.trim() || "check",
				sprint_name: sprint_name?.trim() || null,
				sprint_end_date: sprint_end_date || null,
				sprint_id: sprint_id || null,
				tags: Array.isArray(tags) ? tags : [],
				key: projectKey,
				created_by: req.profile.id,
			})
			.select()
			.single();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "Project key already in use.",
				});
			}
			throw error;
		}

		const { error: memberError } = await supabase
			.from("project_members")
			.insert({
				project_id: data.id,
				user_id: req.profile.id,
				role: "owner",
			});

		if (memberError) throw memberError;

		logActivity({
			projectId: data.id,
			actorId: req.profile.id,
			entityType: "project",
			entityId: data.id,
			action: "project.created",
			metadata: { name: data.name, key: data.key },
		});

		res.status(201).json({
			success: true,
			message: "Project created successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function updateProject(req, res, next) {
	try {
		const { id } = req.params;

		const errors = validateUpdateProject(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const updateData = {};

		if (req.body.name !== undefined) {
			updateData.name = req.body.name.trim();
		}

		if (req.body.description !== undefined) {
			updateData.description = req.body.description?.trim() || null;
		}

		if (req.body.status !== undefined) {
			updateData.status = req.body.status;
		}

		if (req.body.icon_type !== undefined) {
			updateData.icon_type = req.body.icon_type || null;
		}

		if (req.body.icon_value !== undefined) {
			updateData.icon_value = req.body.icon_value?.trim() || null;
		}

		if (req.body.sprint_name !== undefined) {
			updateData.sprint_name = req.body.sprint_name?.trim() || null;
		}

		if (req.body.sprint_end_date !== undefined) {
			updateData.sprint_end_date = req.body.sprint_end_date || null;
		}

		if (req.body.tags !== undefined) {
			updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
		}

		if (req.body.sprint_id !== undefined) {
			updateData.sprint_id = req.body.sprint_id || null;
		}

		if (req.body.key !== undefined) {
			updateData.key = req.body.key?.trim().toUpperCase() || null;
		}

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		const { data, error } = await supabase
			.from("projects")
			.update(updateData)
			.eq("id", id)
			.select()
			.maybeSingle();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "Project key already in use.",
				});
			}
			throw error;
		}

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Project not found.",
			});
		}

		logActivity({
			projectId: id,
			actorId: req.profile.id,
			entityType: "project",
			entityId: id,
			action: "project.updated",
			metadata: {
				name: data.name,
				changed_fields: Object.keys(updateData),
			},
		});

		res.status(200).json({
			success: true,
			message: "Project updated successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteProject(req, res, next) {
	try {
		const { id } = req.params;

		const { data: existingProject, error: findError } = await supabase
			.from("projects")
			.select("id")
			.eq("id", id)
			.maybeSingle();

		if (findError) throw findError;

		if (!existingProject) {
			return res.status(404).json({
				success: false,
				message: "Project not found.",
			});
		}

		const { error } = await supabase.rpc("delete_with_trash", {
			table_name: "projects",
			record_id: id,
			deleter: req.profile.id,
		});

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Project deleted successfully.",
		});
	} catch (error) {
		next(error);
	}
}
