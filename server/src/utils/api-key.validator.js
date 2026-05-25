export const VALID_SCOPES = [
	"tickets:write",
	"tickets:read",
	"tasks:write",
	"tasks:read",
	"status:update",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateApiKey(payload) {
	const errors = [];

	if (!payload.name || typeof payload.name !== "string") {
		errors.push("name is required.");
	} else {
		const trimmed = payload.name.trim();
		if (trimmed.length < 2 || trimmed.length > 50) {
			errors.push("name must be between 2 and 50 characters.");
		}
	}

	if (!payload.project_id || typeof payload.project_id !== "string" || !UUID_REGEX.test(payload.project_id)) {
		errors.push("project_id must be a valid UUID.");
	}

	if (!Array.isArray(payload.scopes) || payload.scopes.length === 0) {
		errors.push("scopes must be a non-empty array.");
	} else {
		const invalid = payload.scopes.filter((s) => !VALID_SCOPES.includes(s));
		if (invalid.length) {
			errors.push(`Unknown scopes: ${invalid.join(", ")}. Allowed: ${VALID_SCOPES.join(", ")}.`);
		}
	}

	if (payload.expires_at !== undefined && payload.expires_at !== null && payload.expires_at !== "") {
		const d = new Date(payload.expires_at);
		if (isNaN(d.getTime())) {
			errors.push("expires_at must be a valid ISO date.");
		} else if (d.getTime() <= Date.now()) {
			errors.push("expires_at must be in the future.");
		}
	}

	return errors;
}
