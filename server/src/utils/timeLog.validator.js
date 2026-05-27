const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DURATION_MINUTES = 1440; // 24h cap per entry
const MAX_DESCRIPTION_LENGTH = 1000;

function validateDuration(value, errors) {
	if (value === undefined || value === null) {
		errors.push("duration_minutes is required.");
		return;
	}
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value <= 0 ||
		value > MAX_DURATION_MINUTES
	) {
		errors.push(
			`duration_minutes must be a positive integer up to ${MAX_DURATION_MINUTES}.`,
		);
	}
}

function validateDescription(value, errors) {
	if (value === undefined || value === null) return;
	if (typeof value !== "string") {
		errors.push("description must be a string.");
		return;
	}
	if (value.length > MAX_DESCRIPTION_LENGTH) {
		errors.push(
			`description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
		);
	}
}

function validateLoggedDate(value, errors) {
	if (value === undefined || value === null) return;
	if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
		errors.push("logged_date must be in YYYY-MM-DD format.");
		return;
	}
	const today = new Date().toISOString().slice(0, 10);
	if (value > today) {
		errors.push("logged_date cannot be in the future.");
	}
}

export function validateCreateTimeLog(payload) {
	const errors = [];
	validateDuration(payload?.duration_minutes, errors);
	validateDescription(payload?.description, errors);
	validateLoggedDate(payload?.logged_date, errors);
	return errors;
}

export function validateUpdateTimeLog(payload) {
	const errors = [];
	if (payload?.duration_minutes !== undefined) {
		validateDuration(payload.duration_minutes, errors);
	}
	validateDescription(payload?.description, errors);
	validateLoggedDate(payload?.logged_date, errors);
	return errors;
}
