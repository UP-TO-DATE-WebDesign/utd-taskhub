import { env } from "../config/env.js";
import { sendEmail } from "../utils/emailer-util.js";

// Maps a notification type to a coarse email-preference category.
// Types not listed are never emailed (in-app only).
export const EMAIL_CATEGORY_BY_TYPE = Object.freeze({
	"project.member_added": "project_membership",
	"project.member_removed": "project_membership",
	"task.assigned": "task_changes",
	"task.updated": "task_changes",
});

function buildHtml({ title, body }) {
	return `
		<h1>${title}</h1>
		${body ? `<p>${body}</p>` : ""}
		<div style="margin: 24px 0;">
			<a
				href="${env.appUrl}"
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
				Open TaskHub
			</a>
		</div>
		<p style="font-size: 12px; color: #666;">
			You are receiving this because email notifications are enabled in your
			profile. You can change this anytime under Profile &gt; Notifications.
		</p>
		<br />
		<p>UTD TaskHub Team</p>
	`;
}

// Best-effort: returns the category if an email was attempted, null if skipped.
// Never throws; missing Gmail env or send failures are logged only.
export async function sendNotificationEmail({ to, title, body, type }) {
	const category = EMAIL_CATEGORY_BY_TYPE[type] ?? null;
	if (!category) return null;
	if (!to) return null;

	if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
		console.log("[notif-email] skipped (Gmail not configured):", { to, type });
		return null;
	}

	try {
		await sendEmail({ to, subject: title, html: buildHtml({ title, body }) });
	} catch (e) {
		console.error("[notif-email] send failed:", e.message);
	}
	return category;
}
