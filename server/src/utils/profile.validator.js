const ALLOWED_ROLES = ["admin", "manager", "developer", "user"];
const ALLOWED_STATUSES = ["active", "invited", "disabled"];
const ALLOWED_THEMES = ["light", "dark", "system"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUpdateProfile(payload, isAdmin = false) {
	const errors = [];

	if (
		payload.full_name !== undefined &&
		payload.full_name !== null &&
		typeof payload.full_name !== "string"
	) {
		errors.push("Full name must be a string.");
	}

	if (
		typeof payload.full_name === "string" &&
		payload.full_name.trim().length > 0 &&
		payload.full_name.trim().length < 2
	) {
		errors.push("Full name must be at least 2 characters.");
	}

	if (
		payload.avatar_url !== undefined &&
		payload.avatar_url !== null &&
		typeof payload.avatar_url !== "string"
	) {
		errors.push("Avatar URL must be a string.");
	}

	if (
		payload.theme !== undefined &&
		!ALLOWED_THEMES.includes(payload.theme)
	) {
		errors.push(`Theme must be one of: ${ALLOWED_THEMES.join(", ")}.`);
	}

	// role and status are admin-only fields
	if (!isAdmin) {
		if (payload.role !== undefined) {
			errors.push("You are not allowed to change your role.");
		}
		if (payload.role_id !== undefined) {
			errors.push("You are not allowed to change your role.");
		}
		if (payload.status !== undefined) {
			errors.push("You are not allowed to change your status.");
		}
	} else {
		if (payload.role !== undefined && !ALLOWED_ROLES.includes(payload.role)) {
			errors.push(`Role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
		}
		if (payload.role_id !== undefined && !UUID_RE.test(payload.role_id)) {
			errors.push("role_id must be a valid UUID.");
		}
		if (
			payload.status !== undefined &&
			!ALLOWED_STATUSES.includes(payload.status)
		) {
			errors.push(`Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`);
		}
	}

	return errors;
}
