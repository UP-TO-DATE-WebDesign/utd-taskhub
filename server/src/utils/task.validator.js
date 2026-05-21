const STATUS_KEY_REGEX = /^[a-z][a-z0-9_-]*$/;
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidStatusKey(value) {
	return typeof value === "string" && STATUS_KEY_REGEX.test(value);
}

export function validateCreateTask(payload) {
	const errors = [];

	if (!payload.title || typeof payload.title !== "string") {
		errors.push("Task title is required.");
	} else if (payload.title.trim().length < 1) {
		errors.push("Task title cannot be empty.");
	}

	if (payload.description !== undefined && payload.description !== null) {
		if (typeof payload.description !== "string") {
			errors.push("Description must be a string.");
		}
	}

	if (payload.status !== undefined && !isValidStatusKey(payload.status)) {
		errors.push("status must be a valid workflow stage key (lowercase, digits, hyphens, underscores).");
	}

	if (payload.priority !== undefined && !VALID_PRIORITIES.includes(payload.priority)) {
		errors.push(`priority must be one of: ${VALID_PRIORITIES.join(", ")}.`);
	}

	if (payload.assigned_to !== undefined && payload.assigned_to !== null) {
		if (typeof payload.assigned_to !== "string" || !UUID_REGEX.test(payload.assigned_to)) {
			errors.push("assigned_to must be a valid UUID.");
		}
	}

	if (payload.board_column_id !== undefined && payload.board_column_id !== null) {
		if (typeof payload.board_column_id !== "string" || !UUID_REGEX.test(payload.board_column_id)) {
			errors.push("board_column_id must be a valid UUID.");
		}
	}

	if (payload.due_date !== undefined && payload.due_date !== null) {
		if (isNaN(Date.parse(payload.due_date))) {
			errors.push("due_date must be a valid date.");
		}
	}

	if (payload.tags !== undefined) {
		if (!Array.isArray(payload.tags)) {
			errors.push("tags must be an array of strings.");
		} else if (payload.tags.some(t => typeof t !== "string" || t.trim().length === 0)) {
			errors.push("Each tag must be a non-empty string.");
		}
	}

	if (payload.ticket_id !== undefined && payload.ticket_id !== null) {
		if (typeof payload.ticket_id !== "string" || !UUID_REGEX.test(payload.ticket_id)) {
			errors.push("ticket_id must be a valid UUID.");
		}
	}

	if (payload.parent_task_id !== undefined && payload.parent_task_id !== null) {
		if (typeof payload.parent_task_id !== "string" || !UUID_REGEX.test(payload.parent_task_id)) {
			errors.push("parent_task_id must be a valid UUID.");
		}
	}

	return errors;
}

export function validateUpdateTask(payload) {
	const errors = [];

	if (payload.title !== undefined) {
		if (typeof payload.title !== "string" || payload.title.trim().length < 1) {
			errors.push("Task title cannot be empty.");
		}
	}

	if (payload.description !== undefined && payload.description !== null) {
		if (typeof payload.description !== "string") {
			errors.push("Description must be a string.");
		}
	}

	if (payload.status !== undefined && !isValidStatusKey(payload.status)) {
		errors.push("status must be a valid workflow stage key (lowercase, digits, hyphens, underscores).");
	}

	if (payload.priority !== undefined && !VALID_PRIORITIES.includes(payload.priority)) {
		errors.push(`priority must be one of: ${VALID_PRIORITIES.join(", ")}.`);
	}

	if (payload.assigned_to !== undefined && payload.assigned_to !== null) {
		if (typeof payload.assigned_to !== "string" || !UUID_REGEX.test(payload.assigned_to)) {
			errors.push("assigned_to must be a valid UUID.");
		}
	}

	if (payload.board_column_id !== undefined && payload.board_column_id !== null) {
		if (typeof payload.board_column_id !== "string" || !UUID_REGEX.test(payload.board_column_id)) {
			errors.push("board_column_id must be a valid UUID.");
		}
	}

	if (payload.due_date !== undefined && payload.due_date !== null) {
		if (isNaN(Date.parse(payload.due_date))) {
			errors.push("due_date must be a valid date.");
		}
	}

	if (payload.tags !== undefined) {
		if (!Array.isArray(payload.tags)) {
			errors.push("tags must be an array of strings.");
		} else if (payload.tags.some(t => typeof t !== "string" || t.trim().length === 0)) {
			errors.push("Each tag must be a non-empty string.");
		}
	}

	if (payload.project_id !== undefined && payload.project_id !== null) {
		if (typeof payload.project_id !== "string" || !UUID_REGEX.test(payload.project_id)) {
			errors.push("project_id must be a valid UUID.");
		}
	}

	if (payload.sprint_id !== undefined && payload.sprint_id !== null) {
		if (typeof payload.sprint_id !== "string" || !UUID_REGEX.test(payload.sprint_id)) {
			errors.push("sprint_id must be a valid UUID.");
		}
	}

	if (payload.parent_task_id !== undefined && payload.parent_task_id !== null) {
		if (typeof payload.parent_task_id !== "string" || !UUID_REGEX.test(payload.parent_task_id)) {
			errors.push("parent_task_id must be a valid UUID.");
		}
	}

	return errors;
}

export function validateMoveTask(payload) {
	const errors = [];

	if (payload.board_column_id === undefined || payload.board_column_id === null) {
		errors.push("board_column_id is required.");
	} else if (typeof payload.board_column_id !== "string" || !UUID_REGEX.test(payload.board_column_id)) {
		errors.push("board_column_id must be a valid UUID.");
	}

	if (payload.position === undefined || payload.position === null) {
		errors.push("position is required.");
	} else if (!Number.isInteger(payload.position) || payload.position < 0) {
		errors.push("position must be a non-negative integer.");
	}

	return errors;
}
