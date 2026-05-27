export function validateUpdateWorkspaceSettings(payload) {
	const errors = [];

	if (payload.workspace_name !== undefined) {
		if (typeof payload.workspace_name !== "string") {
			errors.push("Workspace name must be a string.");
		} else if (payload.workspace_name.trim().length === 0) {
			errors.push("Workspace name is required.");
		} else if (payload.workspace_name.trim().length > 100) {
			errors.push("Workspace name must be 100 characters or fewer.");
		}
	}

	if (
		payload.workspace_timezone !== undefined &&
		(typeof payload.workspace_timezone !== "string" ||
			payload.workspace_timezone.trim().length === 0)
	) {
		errors.push("Workspace timezone must be a non-empty string.");
	}

	if (
		payload.workspace_language !== undefined &&
		(typeof payload.workspace_language !== "string" ||
			payload.workspace_language.trim().length === 0)
	) {
		errors.push("Workspace language must be a non-empty string.");
	}

	if (
		payload.enable_time_logging !== undefined &&
		typeof payload.enable_time_logging !== "boolean"
	) {
		errors.push("enable_time_logging must be a boolean.");
	}

	return errors;
}
