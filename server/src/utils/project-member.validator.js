export const ALLOWED_ROLES = ["owner", "manager", "member", "viewer"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// role_id is intentionally not part of the client contract.
// The server resolves the canonical roles.id from the role key to prevent
// mass-assignment via arbitrary role_id values.
export function validateAddMember(payload) {
	const errors = [];

	if (!payload.user_id || !UUID_RE.test(payload.user_id)) {
		errors.push("user_id must be a valid UUID.");
	}

	if (payload.role !== undefined && !ALLOWED_ROLES.includes(payload.role)) {
		errors.push(`role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
	}

	if (payload.role_id !== undefined) {
		errors.push("role_id is not accepted; send role key only.");
	}

	return errors;
}

export function validateUpdateMemberRole(payload) {
	const errors = [];

	if (!payload.role) {
		errors.push("role is required.");
	}

	if (payload.role !== undefined && !ALLOWED_ROLES.includes(payload.role)) {
		errors.push(`role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
	}

	if (payload.role_id !== undefined) {
		errors.push("role_id is not accepted; send role key only.");
	}

	return errors;
}
