import { Router } from "express";
import { supabase, supabaseAdmin } from "../config/supabase.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { register as registerSseClient } from "../services/sse-hub.service.js";
import { issueTicket, consumeTicket } from "../services/sse-ticket.service.js";
import {
	mergeSettings,
	applySettingsPatch,
	validateNotificationSettings,
} from "../utils/notification-settings.js";
import { env } from "../config/env.js";
import { sendEmail } from "../utils/emailer-util.js";

const router = Router();

// SSE handshake: ticket is single-use, 30s TTL, bound to the issuing user.
// The long-lived JWT is never placed in the URL, avoiding leakage via
// access logs, Referer headers, and browser history.
router.get("/stream", (req, res) => {
	const userId = consumeTicket(req.query.ticket);
	if (!userId) {
		return res
			.status(401)
			.json({ success: false, message: "Invalid or expired ticket." });
	}
	registerSseClient(userId, req, res);
});

router.use(requireAuth);

router.post("/stream/ticket", (req, res) => {
	const { ticket, expiresIn } = issueTicket(req.profile.id);
	res.status(200).json({
		success: true,
		data: { ticket, expires_in: expiresIn },
	});
});

router.get("/settings", async (req, res, next) => {
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("notification_settings")
			.eq("id", req.profile.id)
			.maybeSingle();

		if (error) throw error;

		res.status(200).json({
			success: true,
			data: { settings: mergeSettings(data?.notification_settings) },
		});
	} catch (err) {
		next(err);
	}
});

router.patch("/settings", async (req, res, next) => {
	try {
		const errors = validateNotificationSettings(req.body);
		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { data: existing, error: readError } = await supabase
			.from("profiles")
			.select("notification_settings")
			.eq("id", req.profile.id)
			.maybeSingle();

		if (readError) throw readError;

		const nextSettings = applySettingsPatch(
			existing?.notification_settings,
			req.body,
		);

		const { data, error } = await supabaseAdmin
			.from("profiles")
			.update({ notification_settings: nextSettings })
			.eq("id", req.profile.id)
			.select("notification_settings")
			.maybeSingle();

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Notification settings updated.",
			data: { settings: mergeSettings(data?.notification_settings) },
		});
	} catch (err) {
		next(err);
	}
});

router.post("/test-email", async (req, res, next) => {
	try {
		if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
			return res.status(503).json({
				success: false,
				message: "Email is not configured on the server.",
			});
		}

		const to = req.profile.email;
		if (!to) {
			return res.status(400).json({
				success: false,
				message: "Your profile has no email address.",
			});
		}

		await sendEmail({
			to,
			subject: "TaskHub test notification",
			html: `
				<h1>Test notification</h1>
				<p>This is a test email from TaskHub. If you received this, your email
				notifications are working.</p>
				<div style="margin: 24px 0;">
					<a href="${env.appUrl}" style="background-color:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Open TaskHub</a>
				</div>
				<p style="font-size:12px;color:#666;">You can manage email notifications under Profile &gt; Notifications.</p>
			`,
		});

		res.status(200).json({
			success: true,
			message: `Test email sent to ${to}.`,
		});
	} catch (err) {
		next(err);
	}
});

router.get("/", async (req, res, next) => {
	try {
		const limit = Math.min(Number(req.query.limit) || 50, 100);
		const unreadOnly = req.query.unread === "true";
		const before = req.query.before;

		let query = supabase
			.from("notifications")
			.select("*")
			.eq("user_id", req.profile.id)
			.order("created_at", { ascending: false })
			.limit(limit);

		if (unreadOnly) query = query.eq("read", false);
		if (before) query = query.lt("created_at", before);

		const { data, error } = await query;
		if (error) throw error;

		res.status(200).json({ success: true, count: data.length, data });
	} catch (err) {
		next(err);
	}
});

router.get("/unread-count", async (req, res, next) => {
	try {
		const { count, error } = await supabase
			.from("notifications")
			.select("id", { count: "exact", head: true })
			.eq("user_id", req.profile.id)
			.eq("read", false);

		if (error) throw error;

		res.status(200).json({ success: true, data: { count: count ?? 0 } });
	} catch (err) {
		next(err);
	}
});

router.post("/read-all", async (req, res, next) => {
	try {
		const { error } = await supabase
			.from("notifications")
			.update({ read: true })
			.eq("user_id", req.profile.id)
			.eq("read", false);

		if (error) throw error;

		res.status(200).json({ success: true, message: "All notifications marked read." });
	} catch (err) {
		next(err);
	}
});

router.post("/:id/read", async (req, res, next) => {
	try {
		const { id } = req.params;
		const { data, error } = await supabase
			.from("notifications")
			.update({ read: true })
			.eq("id", id)
			.eq("user_id", req.profile.id)
			.select()
			.maybeSingle();

		if (error) throw error;
		if (!data) {
			return res
				.status(404)
				.json({ success: false, message: "Notification not found." });
		}

		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
});

export default router;
