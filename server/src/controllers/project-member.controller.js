import { supabase } from "../config/supabase.js";
import {
	validateAddMember,
	validateUpdateMemberRole,
} from "../utils/project-member.validator.js";
import {
	createNotifications,
	NotificationType,
} from "../services/notification.service.js";
import { logActivity } from "../services/activity-log.service.js";

// Resolve canonical project role id from key.
// Returns null when no project-scoped role matches; caller decides 400 vs throw.
async function resolveProjectRoleId(key) {
	const { data, error } = await supabase
		.from("roles")
		.select("id")
		.eq("scope", "project")
		.eq("key", key)
		.maybeSingle();
	if (error) throw error;
	return data?.id ?? null;
}

export async function listMembers(req, res, next) {
	try {
		const { projectId } = req.params;

			const { data, error } = await supabase
				.from("project_members")
				.select("*, profiles(id, full_name, email, avatar_url, role), project_role:roles!project_members_role_id_fkey(id, key, name, scope)")
				.eq("project_id", projectId)
			.order("joined_at", { ascending: true });

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

export async function addMember(req, res, next) {
	try {
		const { projectId } = req.params;

		const errors = validateAddMember(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

			const { user_id, role = "member" } = req.body;

			const resolvedRoleId = await resolveProjectRoleId(role);
			if (!resolvedRoleId) {
				return res.status(400).json({
					success: false,
					message: `Unknown project role: ${role}.`,
				});
			}

			const memberData = {
				project_id: projectId,
				user_id,
				role,
				role_id: resolvedRoleId,
			};

			const { data, error } = await supabase
				.from("project_members")
				.insert(memberData)
				.select("*, profiles(id, full_name, email, avatar_url, role), project_role:roles!project_members_role_id_fkey(id, key, name, scope)")
				.single();

		if (error) {
			if (error.code === "23505") {
				return res.status(409).json({
					success: false,
					message: "User is already a member of this project.",
				});
			}
			throw error;
		}

		if (user_id && user_id !== req.profile.id) {
			createNotifications({
				userIds: [user_id],
				type: NotificationType.PROJECT_MEMBER_ADDED,
				title: "Added to a project",
				body: data?.profiles?.full_name
					? `You were added to a project by ${req.profile.full_name ?? "a teammate"}.`
					: "You were added to a project.",
				data: { project_id: projectId, role },
			}).catch((e) => console.error("[notif]", e));
		}

		logActivity({
			projectId,
			actorId: req.profile.id,
			entityType: "project_member",
			entityId: user_id,
			action: "member.added",
			metadata: {
				target_user_id: user_id,
				target_user_name: data?.profiles?.full_name ?? null,
				role,
			},
		});

		res.status(201).json({
			success: true,
			message: "Member added successfully.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function updateMemberRole(req, res, next) {
	try {
		const { projectId, userId } = req.params;

		const errors = validateUpdateMemberRole(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

			const resolvedRoleId = await resolveProjectRoleId(req.body.role);
			if (!resolvedRoleId) {
				return res.status(400).json({
					success: false,
					message: `Unknown project role: ${req.body.role}.`,
				});
			}

			const { data: existing } = await supabase
				.from("project_members")
				.select("role")
				.eq("project_id", projectId)
				.eq("user_id", userId)
				.maybeSingle();

			const updateData = {
				role: req.body.role,
				role_id: resolvedRoleId,
			};

			const { data, error } = await supabase
				.from("project_members")
				.update(updateData)
				.eq("project_id", projectId)
				.eq("user_id", userId)
				.select("*, profiles(id, full_name, email, avatar_url, role), project_role:roles!project_members_role_id_fkey(id, key, name, scope)")
				.maybeSingle();

		if (error) throw error;

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Member not found.",
			});
		}

		if (userId && userId !== req.profile.id) {
			createNotifications({
				userIds: [userId],
				type: NotificationType.ROLE_CHANGED,
				title: "Project role updated",
				body: `Your role in this project was changed to ${data.role}.`,
				data: {
					scope: "project",
					project_id: projectId,
					role: data.role,
				},
			}).catch((e) => console.error("[notif]", e));
		}

		logActivity({
			projectId,
			actorId: req.profile.id,
			entityType: "project_member",
			entityId: userId,
			action: "member.role_changed",
			metadata: {
				target_user_id: userId,
				target_user_name: data?.profiles?.full_name ?? null,
				from_role: existing?.role ?? null,
				to_role: data.role,
			},
		});

		res.status(200).json({
			success: true,
			message: "Member role updated.",
			data,
		});
	} catch (error) {
		next(error);
	}
}

export async function removeMember(req, res, next) {
	try {
		const { projectId, userId } = req.params;

		const { data: existing, error: findError } = await supabase
			.from("project_members")
			.select("id, role, profiles(id, full_name)")
			.eq("project_id", projectId)
			.eq("user_id", userId)
			.maybeSingle();

		if (findError) throw findError;

		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Member not found.",
			});
		}

		const { error } = await supabase
			.from("project_members")
			.delete()
			.eq("project_id", projectId)
			.eq("user_id", userId);

		if (error) throw error;

		if (userId && userId !== req.profile.id) {
			createNotifications({
				userIds: [userId],
				type: NotificationType.PROJECT_MEMBER_REMOVED,
				title: "Removed from a project",
				body: `You were removed from a project by ${req.profile.full_name ?? "a teammate"}.`,
				data: { project_id: projectId },
			}).catch((e) => console.error("[notif]", e));
		}

		logActivity({
			projectId,
			actorId: req.profile.id,
			entityType: "project_member",
			entityId: userId,
			action: "member.removed",
			metadata: {
				target_user_id: userId,
				target_user_name: existing.profiles?.full_name ?? null,
				role: existing.role,
			},
		});

		res.status(200).json({
			success: true,
			message: "Member removed successfully.",
		});
	} catch (error) {
		next(error);
	}
}
