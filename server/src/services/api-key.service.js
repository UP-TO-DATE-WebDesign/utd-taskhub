import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

const PREFIX = "thk_live_";

export function generatePlaintextKey() {
	const random = crypto.randomBytes(32).toString("base64url");
	return `${PREFIX}${random}`;
}

export function hashApiKey(plaintext) {
	return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export function isApiKeyToken(token) {
	return typeof token === "string" && token.startsWith(PREFIX);
}

export function publicKeyPrefix(plaintext) {
	// First 16 chars (incl. prefix) is enough to identify visually
	return plaintext.slice(0, 16);
}

export async function createApiKeyRecord({
	ownerUserId,
	projectId,
	name,
	scopes,
	expiresAt,
}) {
	const { data: membership, error: memErr } = await supabaseAdmin
		.from("project_members")
		.select("user_id")
		.eq("project_id", projectId)
		.eq("user_id", ownerUserId)
		.maybeSingle();
	if (memErr) throw memErr;
	if (!membership) {
		const err = new Error("You are not a member of this project.");
		err.statusCode = 403;
		throw err;
	}

	const plaintext = generatePlaintextKey();
	const key_hash = hashApiKey(plaintext);
	const key_prefix = publicKeyPrefix(plaintext);

	const { data, error } = await supabaseAdmin
		.from("api_keys")
		.insert({
			key_hash,
			key_prefix,
			name: name.trim(),
			owner_user_id: ownerUserId,
			project_id: projectId,
			scopes,
			expires_at: expiresAt || null,
		})
		.select("id, key_prefix, name, project_id, scopes, expires_at, created_at")
		.single();

	if (error) throw error;

	return { plaintext, record: data };
}

export async function listApiKeysForUser(userId) {
	const { data, error } = await supabaseAdmin
		.from("api_keys")
		.select(
			`id, key_prefix, name, project_id, scopes, expires_at,
			 last_used_at, last_used_ip, revoked_at, created_at,
			 project:projects ( id, name, key )`,
		)
		.eq("owner_user_id", userId)
		.order("created_at", { ascending: false });

	if (error) throw error;
	return data;
}

export async function revokeApiKeyForUser(userId, keyId) {
	const { data, error } = await supabaseAdmin
		.from("api_keys")
		.update({ revoked_at: new Date().toISOString() })
		.eq("id", keyId)
		.eq("owner_user_id", userId)
		.is("revoked_at", null)
		.select("id")
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function findActiveKeyByPlaintext(plaintext) {
	if (!isApiKeyToken(plaintext)) return null;
	const key_hash = hashApiKey(plaintext);

	const { data, error } = await supabaseAdmin
		.from("api_keys")
		.select("id, owner_user_id, project_id, scopes, expires_at, revoked_at, name")
		.eq("key_hash", key_hash)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export function touchApiKeyUsage(keyId, ip) {
	// fire-and-forget; never block request
	supabaseAdmin
		.from("api_keys")
		.update({
			last_used_at: new Date().toISOString(),
			last_used_ip: ip || null,
		})
		.eq("id", keyId)
		.then(({ error }) => {
			if (error) console.error("[api-key] touch:", error.message);
		});
}
