const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

function validateName(payload, errors) {
	if (payload.name !== undefined) {
		if (typeof payload.name !== "string") {
			errors.push("Name must be a string.");
		} else if (payload.name.trim().length === 0) {
			errors.push("Name is required.");
		} else if (payload.name.trim().length > 60) {
			errors.push("Name must be 60 characters or fewer.");
		}
	}
}

function validateColor(payload, errors) {
	if (payload.color !== undefined) {
		if (typeof payload.color !== "string" || !HEX_REGEX.test(payload.color)) {
			errors.push("Color must be a hex string like #0058be.");
		}
	}
}

function validatePosition(payload, errors) {
	if (payload.position !== undefined) {
		if (!Number.isInteger(payload.position) || payload.position < 0) {
			errors.push("Position must be a non-negative integer.");
		}
	}
}

export function validateCreateWorkflowStage(payload) {
	const errors = [];

	if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
		errors.push("Name is required.");
	} else {
		validateName(payload, errors);
	}

	validateColor(payload, errors);
	validatePosition(payload, errors);

	return errors;
}

export function validateUpdateWorkflowStage(payload) {
	const errors = [];
	validateName(payload, errors);
	validateColor(payload, errors);
	validatePosition(payload, errors);
	return errors;
}

export function slugifyKey(name) {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/^([0-9])/, "s$1") || "stage";
}
