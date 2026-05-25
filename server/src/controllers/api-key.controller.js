import {
	createApiKeyRecord,
	listApiKeysForUser,
	revokeApiKeyForUser,
} from "../services/api-key.service.js";
import { validateCreateApiKey } from "../utils/api-key.validator.js";

export async function listMyApiKeys(req, res, next) {
	try {
		const keys = await listApiKeysForUser(req.profile.id);
		res.status(200).json({ success: true, count: keys.length, data: keys });
	} catch (err) {
		next(err);
	}
}

export async function createMyApiKey(req, res, next) {
	try {
		const errors = validateCreateApiKey(req.body || {});
		if (errors.length) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { name, project_id, scopes, expires_at } = req.body;

		const { plaintext, record } = await createApiKeyRecord({
			ownerUserId: req.profile.id,
			projectId: project_id,
			name,
			scopes,
			expiresAt: expires_at || null,
		});

		res.status(201).json({
			success: true,
			message: "API key created. Copy it now; it will not be shown again.",
			data: { ...record, key: plaintext },
		});
	} catch (err) {
		if (err.statusCode) {
			return res.status(err.statusCode).json({
				success: false,
				message: err.message,
			});
		}
		next(err);
	}
}

export async function revokeMyApiKey(req, res, next) {
	try {
		const { id } = req.params;
		const result = await revokeApiKeyForUser(req.profile.id, id);
		if (!result) {
			return res.status(404).json({
				success: false,
				message: "API key not found or already revoked.",
			});
		}
		res.status(200).json({ success: true, message: "API key revoked." });
	} catch (err) {
		next(err);
	}
}
