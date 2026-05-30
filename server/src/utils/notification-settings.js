// Single source of truth for notification preference shape.
// Mirrors the default in migration 052_notification_settings.sql.
export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
	email_enabled: false,
	email: {
		project_membership: true,
		task_changes: true,
	},
	system: {
		"project.member_added": true,
		"project.member_removed": true,
		"task.assigned": true,
		"task.updated": true,
		"task.due_soon": true,
		"task.overdue": true,
		"ticket.closed": true,
		"comment.mentioned": true,
		"role.changed": true,
		"sprint.started": true,
		"sprint.ended": true,
	},
});

const EMAIL_KEYS = Object.keys(DEFAULT_NOTIFICATION_SETTINGS.email);
const SYSTEM_KEYS = Object.keys(DEFAULT_NOTIFICATION_SETTINGS.system);

// Fill any missing keys from defaults so newly added types always surface.
export function mergeSettings(stored) {
	const s = stored && typeof stored === "object" ? stored : {};
	return {
		email_enabled:
			typeof s.email_enabled === "boolean"
				? s.email_enabled
				: DEFAULT_NOTIFICATION_SETTINGS.email_enabled,
		email: { ...DEFAULT_NOTIFICATION_SETTINGS.email, ...(s.email || {}) },
		system: { ...DEFAULT_NOTIFICATION_SETTINGS.system, ...(s.system || {}) },
	};
}

// Deep-merge an incoming patch over stored settings, ignoring unknown keys.
export function applySettingsPatch(stored, patch) {
	const base = mergeSettings(stored);
	const next = {
		email_enabled: base.email_enabled,
		email: { ...base.email },
		system: { ...base.system },
	};

	if (typeof patch.email_enabled === "boolean") {
		next.email_enabled = patch.email_enabled;
	}
	if (patch.email && typeof patch.email === "object") {
		for (const k of EMAIL_KEYS) {
			if (typeof patch.email[k] === "boolean") next.email[k] = patch.email[k];
		}
	}
	if (patch.system && typeof patch.system === "object") {
		for (const k of SYSTEM_KEYS) {
			if (typeof patch.system[k] === "boolean") next.system[k] = patch.system[k];
		}
	}

	return next;
}

export function validateNotificationSettings(payload) {
	const errors = [];

	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		errors.push("Notification settings must be an object.");
		return errors;
	}

	if (
		payload.email_enabled !== undefined &&
		typeof payload.email_enabled !== "boolean"
	) {
		errors.push("email_enabled must be a boolean.");
	}

	if (payload.email !== undefined) {
		if (typeof payload.email !== "object" || payload.email === null) {
			errors.push("email must be an object.");
		} else {
			for (const [k, v] of Object.entries(payload.email)) {
				if (!EMAIL_KEYS.includes(k)) {
					errors.push(`Unknown email setting: ${k}.`);
				} else if (typeof v !== "boolean") {
					errors.push(`email.${k} must be a boolean.`);
				}
			}
		}
	}

	if (payload.system !== undefined) {
		if (typeof payload.system !== "object" || payload.system === null) {
			errors.push("system must be an object.");
		} else {
			for (const [k, v] of Object.entries(payload.system)) {
				if (!SYSTEM_KEYS.includes(k)) {
					errors.push(`Unknown system setting: ${k}.`);
				} else if (typeof v !== "boolean") {
					errors.push(`system.${k} must be a boolean.`);
				}
			}
		}
	}

	return errors;
}
