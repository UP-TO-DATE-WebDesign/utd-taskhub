import { supabase, supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { userHasGlobalPermission } from "../middlewares/permission.middleware.js";
import { validateUpdateProfile } from "../utils/profile.validator.js";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
]);
const PROFILE_SELECT = "id, email, full_name, avatar_url, role, role_id, status, theme, created_at, updated_at, global_role:roles!profiles_role_id_fkey(id, key, name, scope)";

function decodeAvatar(data) {
	if (typeof data !== "string" || data.trim().length === 0) {
		return null;
	}

	const base64 = data.includes(",") ? data.split(",").pop() : data;
	return Buffer.from(base64, "base64");
}

async function canUpdateProfile(req, id) {
	const canManageProfiles = await userHasGlobalPermission(req, "profiles.manage");
	const isSelf = req.profile.id === id;

	return { allowed: isSelf || canManageProfiles, canManageProfiles };
}

export async function listProfiles(req, res, next) {
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("id, full_name, email, avatar_url, role, role_id, status, global_role:roles!profiles_role_id_fkey(id, key, name, scope)")
			.eq("status", "active")
			.order("full_name", { ascending: true });

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

export async function getProfile(req, res, next) {
	try {
		const { id } = req.params;

		const { data: profile, error } = await supabase
			.from("profiles")
			.select(PROFILE_SELECT)
			.eq("id", id)
			.maybeSingle();

		if (error) throw error;

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Profile not found.",
			});
		}

		res.status(200).json({
			success: true,
			data: { profile },
		});
	} catch (error) {
		next(error);
	}
}

export async function updateProfile(req, res, next) {
	try {
		const { id } = req.params;
		const { allowed, canManageProfiles } = await canUpdateProfile(req, id);

		// Only the profile owner or a profile manager can update a profile.
		if (!allowed) {
			return res.status(403).json({
				success: false,
				message: "You can only update your own profile.",
			});
		}

		const errors = validateUpdateProfile(req.body, canManageProfiles);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		// Build update payload from allowed fields
		const updateData = {};

		if (req.body.full_name !== undefined) {
			updateData.full_name =
				req.body.full_name?.trim() || null;
		}

		if (req.body.avatar_url !== undefined) {
			updateData.avatar_url = req.body.avatar_url?.trim() || null;
		}

		if (req.body.theme !== undefined) {
			updateData.theme = req.body.theme;
		}

		// Permission-protected fields
		if (canManageProfiles) {
			if (req.body.role !== undefined) {
				updateData.role = req.body.role;
			}
			if (req.body.role_id !== undefined) {
				updateData.role_id = req.body.role_id;
			}
			if (req.body.status !== undefined) {
				updateData.status = req.body.status;
			}
		}

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		const { data: profile, error } = await supabaseAdmin
			.from("profiles")
			.update(updateData)
			.eq("id", id)
			.select(PROFILE_SELECT)
			.maybeSingle();

		if (error) throw error;

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Profile not found.",
			});
		}

		res.status(200).json({
			success: true,
			message: "Profile updated successfully.",
			data: { profile },
		});
	} catch (error) {
		next(error);
	}
}

export async function updateAvatar(req, res, next) {
	try {
		const { id } = req.params;
		const { allowed } = await canUpdateProfile(req, id);

		if (!allowed) {
			return res.status(403).json({
				success: false,
				message: "You can only update your own profile.",
			});
		}

		const contentType = req.body?.content_type;
		const extension = AVATAR_MIME_TYPES.get(contentType);

		if (!extension) {
			return res.status(400).json({
				success: false,
				message: "Avatar must be a JPG, PNG, WebP, or GIF image.",
			});
		}

		const avatarBuffer = decodeAvatar(req.body?.data);

		if (!avatarBuffer || avatarBuffer.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Avatar image is required.",
			});
		}

		if (avatarBuffer.length > AVATAR_MAX_BYTES) {
			return res.status(400).json({
				success: false,
				message: "Avatar image must be 2 MB or smaller.",
			});
		}

		const safeId = id.replace(/[^a-z0-9-]/gi, "");
		const objectPath = `${safeId}/${Date.now()}.${extension}`;
		const { error: uploadError } = await supabaseAdmin.storage
			.from(env.supabaseAvatarBucket)
			.upload(objectPath, avatarBuffer, {
				contentType,
				upsert: false,
			});

		if (uploadError) throw uploadError;

		const { data: publicData } = supabaseAdmin.storage
			.from(env.supabaseAvatarBucket)
			.getPublicUrl(objectPath);

		const { data: profile, error } = await supabaseAdmin
			.from("profiles")
			.update({ avatar_url: publicData.publicUrl })
			.eq("id", id)
			.select(PROFILE_SELECT)
			.maybeSingle();

		if (error) throw error;

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Profile not found.",
			});
		}

		res.status(200).json({
			success: true,
			message: "Avatar updated successfully.",
			data: { profile },
		});
	} catch (error) {
		next(error);
	}
}
