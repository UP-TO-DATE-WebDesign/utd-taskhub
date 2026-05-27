import { supabase, supabaseAdmin } from "../config/supabase.js";
import { userHasGlobalPermission } from "../middlewares/permission.middleware.js";
import { validateUpdateWorkspaceSettings } from "../utils/workspace-settings.validator.js";

const SETTINGS_SELECT =
	"id, workspace_name, workspace_timezone, workspace_language, enable_time_logging, created_at, updated_at";

const FEATURE_FLAGS_SELECT = "enable_time_logging";

async function canReadSettings(req) {
	const [canRead, canManage] = await Promise.all([
		userHasGlobalPermission(req, "roles.read"),
		userHasGlobalPermission(req, "roles.manage"),
	]);
	return canRead || canManage;
}

export async function getSettings(req, res, next) {
	try {
		if (!(await canReadSettings(req))) {
			return res.status(403).json({
				success: false,
				message: "Access denied. Required permission: roles.read.",
			});
		}

		const { data: settings, error } = await supabase
			.from("workspace_settings")
			.select(SETTINGS_SELECT)
			.order("created_at", { ascending: true })
			.limit(1)
			.maybeSingle();

		if (error) throw error;

		if (!settings) {
			return res.status(404).json({
				success: false,
				message: "Workspace settings not found.",
			});
		}

		res.status(200).json({
			success: true,
			data: { settings },
		});
	} catch (error) {
		next(error);
	}
}

export async function getFeatureFlags(req, res, next) {
	try {
		const { data, error } = await supabaseAdmin
			.from("workspace_settings")
			.select(FEATURE_FLAGS_SELECT)
			.order("created_at", { ascending: true })
			.limit(1)
			.maybeSingle();

		if (error) throw error;

		const flags = {
			enable_time_logging: data?.enable_time_logging ?? true,
		};

		res.status(200).json({ success: true, data: { flags } });
	} catch (error) {
		next(error);
	}
}

export async function updateSettings(req, res, next) {
	try {
		const canManage = await userHasGlobalPermission(req, "roles.manage");
		if (!canManage) {
			return res.status(403).json({
				success: false,
				message: "Access denied. Required permission: roles.manage.",
			});
		}

		const errors = validateUpdateWorkspaceSettings(req.body ?? {});
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const updateData = {};
		if (req.body.workspace_name !== undefined) {
			updateData.workspace_name = req.body.workspace_name.trim();
		}
		if (req.body.workspace_timezone !== undefined) {
			updateData.workspace_timezone = req.body.workspace_timezone.trim();
		}
		if (req.body.workspace_language !== undefined) {
			updateData.workspace_language = req.body.workspace_language.trim();
		}
		if (req.body.enable_time_logging !== undefined) {
			updateData.enable_time_logging = req.body.enable_time_logging;
		}

		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No valid fields provided for update.",
			});
		}

		const { data: existing, error: fetchError } = await supabaseAdmin
			.from("workspace_settings")
			.select("id")
			.order("created_at", { ascending: true })
			.limit(1)
			.maybeSingle();

		if (fetchError) throw fetchError;

		if (!existing) {
			return res.status(404).json({
				success: false,
				message: "Workspace settings not found.",
			});
		}

		const { data: settings, error } = await supabaseAdmin
			.from("workspace_settings")
			.update(updateData)
			.eq("id", existing.id)
			.select(SETTINGS_SELECT)
			.maybeSingle();

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Workspace settings updated successfully.",
			data: { settings },
		});
	} catch (error) {
		next(error);
	}
}
