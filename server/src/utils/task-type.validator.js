const KEY_REGEX = /^[a-z][a-z0-9_]*$/;
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

function validateDescription(payload, errors) {
	if (
		payload.description !== undefined &&
		payload.description !== null &&
		typeof payload.description !== "string"
	) {
		errors.push("Description must be a string.");
	}
}

function validateColor(payload, errors) {
	if (payload.color !== undefined) {
		if (typeof payload.color !== "string" || !HEX_REGEX.test(payload.color)) {
			errors.push("Color must be a hex string like #0058be.");
		}
	}
}

function validateIcon(payload, errors) {
	if (payload.icon !== undefined) {
		if (typeof payload.icon !== "string" || payload.icon.trim().length === 0) {
			errors.push("Icon must be a non-empty string.");
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

function validateIsDefault(payload, errors) {
	if (payload.is_default !== undefined && typeof payload.is_default !== "boolean") {
		errors.push("is_default must be a boolean.");
	}
}

export function validateCreateTaskType(payload) {
	const errors = [];

	if (typeof payload.key !== "string" || !KEY_REGEX.test(payload.key)) {
		errors.push("Key must be lowercase letters, digits, and underscores.");
	}

	if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
		errors.push("Name is required.");
	} else {
		validateName(payload, errors);
	}

	validateDescription(payload, errors);
	validateColor(payload, errors);
	validateIcon(payload, errors);
	validatePosition(payload, errors);
	validateIsDefault(payload, errors);

	return errors;
}

export function validateUpdateTaskType(payload) {
	const errors = [];
	validateName(payload, errors);
	validateDescription(payload, errors);
	validateColor(payload, errors);
	validateIcon(payload, errors);
	validatePosition(payload, errors);
	validateIsDefault(payload, errors);
	return errors;
}
