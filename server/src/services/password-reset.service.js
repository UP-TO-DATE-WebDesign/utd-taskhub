import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { sendEmail } from "../utils/emailer-util.js";

const RESET_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const normalizeEmail = (email) => email.trim().toLowerCase();

const generateResetEmailTemplate = ({ resetUrl }) => `
	<h1>Reset your TaskHub password</h1>

	<p>We received a request to reset your password.</p>

	<p>
		This link expires in 7 days.
		If you didn't request this, ignore this email.
	</p>

	<div style="margin: 24px 0;">
		<a
			href="${resetUrl}"
			style="
				background-color: #2563eb;
				color: #ffffff;
				padding: 12px 20px;
				text-decoration: none;
				border-radius: 6px;
				display: inline-block;
				font-weight: bold;
			"
		>
			Reset Password
		</a>
	</div>

	<p style="font-size: 12px; color: #666;">
		If the button doesn't work, copy and paste this link:
		<br />
		${resetUrl}
	</p>

	<br />

	<p>
		— UTD TaskHub Team
	</p>
`;

async function findActiveUserByEmail(email) {
	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("id, email, status")
		.eq("email", email)
		.maybeSingle();
	if (error) throw error;
	if (!data || data.status === "disabled") return null;
	return data;
}

async function createResetToken({ userId, email }) {
	// Invalidate any prior unused tokens for this user.
	await supabaseAdmin
		.from("password_reset_tokens")
		.update({ used_at: new Date().toISOString() })
		.eq("user_id", userId)
		.is("used_at", null);

	const { data, error } = await supabaseAdmin
		.from("password_reset_tokens")
		.insert({
			user_id: userId,
			email,
			expires_at: new Date(Date.now() + RESET_EXPIRATION_MS).toISOString(),
		})
		.select("token")
		.single();
	if (error) throw error;
	return data.token;
}

export async function sendPasswordResetEmail(rawEmail) {
	if (!isValidEmail(rawEmail)) return;

	const email = normalizeEmail(rawEmail);
	const user = await findActiveUserByEmail(email);
	if (!user) return;

	const token = await createResetToken({ userId: user.id, email });
	const resetUrl = `${env.appUrl}/reset-password?token=${token}`;

	await sendEmail({
		to: email,
		subject: "Reset your TaskHub password 🔐",
		html: generateResetEmailTemplate({ resetUrl }),
		text: `Reset your TaskHub password: ${resetUrl} (expires in 7 days)`,
	});
}

export async function consumeResetToken(token) {
	const { data, error } = await supabaseAdmin
		.from("password_reset_tokens")
		.select("id, user_id, email, expires_at, used_at")
		.eq("token", token)
		.maybeSingle();
	if (error) throw error;
	if (!data) return { ok: false, reason: "invalid" };
	if (data.used_at) return { ok: false, reason: "used" };
	if (new Date(data.expires_at) < new Date())
		return { ok: false, reason: "expired" };
	return { ok: true, row: data };
}

export async function markResetTokenUsed(id) {
	await supabaseAdmin
		.from("password_reset_tokens")
		.update({ used_at: new Date().toISOString() })
		.eq("id", id);
}
