const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_MENTIONS = 25;

function validateMentionedUserIds(payload, errors) {
	if (payload.mentioned_user_ids === undefined || payload.mentioned_user_ids === null) return;
	if (!Array.isArray(payload.mentioned_user_ids)) {
		errors.push("mentioned_user_ids must be an array.");
		return;
	}
	if (payload.mentioned_user_ids.length > MAX_MENTIONS) {
		errors.push(`mentioned_user_ids cannot exceed ${MAX_MENTIONS} entries.`);
		return;
	}
	for (const id of payload.mentioned_user_ids) {
		if (typeof id !== "string" || !UUID_RE.test(id)) {
			errors.push("mentioned_user_ids must contain valid UUIDs.");
			return;
		}
	}
}

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

	validateMentionedUserIds(payload, errors);

	return errors;
}

export function validateUpdateComment(payload) {
	const errors = [];

	if (payload.body !== undefined) {
		if (typeof payload.body !== "string" || payload.body.trim().length === 0) {
			errors.push("Body must be a non-empty string.");
		}
	}

	validateMentionedUserIds(payload, errors);

	return errors;
}
