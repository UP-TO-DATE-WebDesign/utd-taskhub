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
