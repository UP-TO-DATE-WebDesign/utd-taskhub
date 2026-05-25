import {
	findActiveKeyByPlaintext,
	isApiKeyToken,
	touchApiKeyUsage,
} from "../services/api-key.service.js";

function unauthorized(res, message) {
	return res.status(401).json({ success: false, message });
}

export function requireApiKey(requiredScope) {
	return async function (req, res, next) {
		try {
			const header = req.headers.authorization;
			if (!header || !header.startsWith("Bearer ")) {
				return unauthorized(res, "Missing API key. Send Authorization: Bearer <key>.");
			}

			const token = header.slice("Bearer ".length).trim();
			if (!isApiKeyToken(token)) {
				return unauthorized(res, "Invalid API key format.");
			}

			const record = await findActiveKeyByPlaintext(token);
			if (!record) {
				return unauthorized(res, "API key not recognised.");
			}
			if (record.revoked_at) {
				return unauthorized(res, "API key has been revoked.");
			}
			if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
				return unauthorized(res, "API key has expired.");
			}

			if (requiredScope && !record.scopes.includes(requiredScope)) {
				return res.status(403).json({
					success: false,
					message: `API key missing required scope: ${requiredScope}.`,
				});
			}

			req.apiKey = {
				id: record.id,
				owner_user_id: record.owner_user_id,
				project_id: record.project_id,
				scopes: record.scopes,
				name: record.name,
			};

			touchApiKeyUsage(record.id, req.ip);
			next();
		} catch (err) {
			next(err);
		}
	};
}
