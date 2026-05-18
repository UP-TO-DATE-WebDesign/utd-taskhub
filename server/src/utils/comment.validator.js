const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateComment(payload) {
	const errors = [];

	if (!payload.body || typeof payload.body !== "string" || payload.body.trim().length === 0) {
		errors.push("Body is required.");
	}

	if (
		payload.parent_comment_id !== undefined &&
		payload.parent_comment_id !== null &&
		(typeof payload.parent_comment_id !== "string" ||
			!UUID_RE.test(payload.parent_comment_id))
	) {
		errors.push("parent_comment_id must be a valid UUID.");
	}

	return errors;
}

export function validateUpdateComment(payload) {
	const errors = [];

	if (payload.body !== undefined) {
		if (typeof payload.body !== "string" || payload.body.trim().length === 0) {
			errors.push("Body must be a non-empty string.");
		}
	}

	return errors;
}
