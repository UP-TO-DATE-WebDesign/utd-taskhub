const ALLOWED_STATUS_KEYS = [
	"backlog",
	"todo",
	"in-progress",
	"qa",
	"done",
	"cancelled",
];

export function validateCreateColumn(payload) {
	const errors = [];

	if (!payload.name || typeof payload.name !== "string") {
		errors.push("Column name is required.");
	} else if (payload.name.trim().length < 1) {
		errors.push("Column name cannot be empty.");
	}

	if (!payload.status_key) {
		errors.push("status_key is required.");
	} else if (!ALLOWED_STATUS_KEYS.includes(payload.status_key)) {
		errors.push(`status_key must be one of: ${ALLOWED_STATUS_KEYS.join(", ")}.`);
	}

	if (payload.position !== undefined) {
		if (!Number.isInteger(payload.position) || payload.position < 0) {
			errors.push("Position must be a non-negative integer.");
		}
	}

	return errors;
}

export function validateUpdateColumn(payload) {
	const errors = [];

	if (payload.name !== undefined) {
		if (typeof payload.name !== "string" || payload.name.trim().length < 1) {
			errors.push("Column name cannot be empty.");
		}
	}

	if (
		payload.status_key !== undefined &&
		!ALLOWED_STATUS_KEYS.includes(payload.status_key)
	) {
		errors.push(`status_key must be one of: ${ALLOWED_STATUS_KEYS.join(", ")}.`);
	}

	if (payload.position !== undefined) {
		if (!Number.isInteger(payload.position) || payload.position < 0) {
			errors.push("Position must be a non-negative integer.");
		}
	}

	return errors;
}

export function validateReorderColumns(payload) {
	const errors = [];

	if (!Array.isArray(payload.columns)) {
		errors.push("columns must be an array.");
		return errors;
	}

	if (payload.columns.length === 0) {
		errors.push("columns array cannot be empty.");
		return errors;
	}

	payload.columns.forEach((item, index) => {
		if (!item.id || typeof item.id !== "string") {
			errors.push(`columns[${index}]: id is required.`);
		}
		if (!Number.isInteger(item.position) || item.position < 0) {
			errors.push(`columns[${index}]: position must be a non-negative integer.`);
		}
	});

	return errors;
}
