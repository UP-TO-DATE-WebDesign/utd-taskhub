import sharp from "sharp";
import { supabaseAdmin } from "../config/supabase.js";
import { buildSprintUpdates } from "../services/sprint-report.service.js";
import {
	bulkImportUpdates,
	generateReport,
	uploadImage,
	listUpdates,
} from "../services/dev-updates.service.js";

const REPORT_SELECT = `
	id, sprint_id, month, year, title, content, stats, external_report_id,
	created_at, updated_at,
	created_by:profiles!sprint_reports_created_by_fkey ( id, full_name, email ),
	sprint:sprints!sprint_reports_sprint_id_fkey ( id, name, start_date, end_date, status )
`;

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function isAdminOrManager(profile) {
	const roleKey = profile?.global_role?.key ?? profile?.role;
	return roleKey === "admin" || roleKey === "manager";
}

function decodeDataUrl(data) {
	if (typeof data !== "string" || data.trim().length === 0) return null;
	const base64 = data.includes(",") ? data.split(",").pop() : data;
	return Buffer.from(base64, "base64");
}

// Shared logic: build updates, push to external API, pull AI report, store it.
// Returns the saved row, or null when the sprint has no completed work.
export async function generateAndStoreSprintReport({ sprintId, profileId }) {
	const built = await buildSprintUpdates(sprintId);

	if (!built) {
		const err = new Error("Sprint not found.");
		err.statusCode = 404;
		throw err;
	}

	const { sprint, updates, month, year } = built;

	const bulkData = await bulkImportUpdates(updates);

	/****
	 * DO NOT DELETE
	 * Commented for a reason, 
	 * Generate Report through API call is not Confirmed
	const report = await generateReport(month, year);
	const row = {
		sprint_id: sprintId,
		month,
		year,
		title: sprint.name || report.month || `Sprint report`,
		content: report.report ?? "",
		stats: report.stats ?? {},
		external_report_id: report.reportId ?? null,
		created_by: profileId ?? null,
	};

	const { data, error } = await supabaseAdmin
		.from("sprint_reports")
		.upsert(row, { onConflict: "sprint_id" })
		.select(REPORT_SELECT)
		.single();
	*****/

	if (error) throw error;
	return bulkData;
}

export async function generateSprintReport(req, res, next) {
	try {
		if (!isAdminOrManager(req.profile)) {
			return res.status(403).json({
				success: false,
				message:
					"Only admins and managers can generate sprint reports.",
			});
		}

		const { sprintId } = req.body ?? {};
		if (!sprintId) {
			return res
				.status(400)
				.json({ success: false, message: "sprintId is required." });
		}

		const saved = await generateAndStoreSprintReport({
			sprintId,
			profileId: req.profile.id,
		});

		res.status(201).json({ success: true, data: saved });
	} catch (error) {
		if (error.statusCode) {
			return res.status(error.statusCode).json({
				success: false,
				body: req.body,
				message: error.message,
			});
		}
		next(error);
	}
}

export async function listDevUpdates(req, res, next) {
	try {
		if (!isAdminOrManager(req.profile)) {
			return res.status(403).json({
				success: false,
				message: "Only admins and managers can view dev updates.",
			});
		}

		const { app, type, search, page, limit } = req.query;
		const data = await listUpdates({ app, type, search, page, limit });

		res.status(200).json({ success: true, ...data });
	} catch (error) {
		if (error.statusCode) {
			return res
				.status(error.statusCode)
				.json({ success: false, message: error.message });
		}
		next(error);
	}
}

export async function listSprintReports(req, res, next) {
	try {
		const { sprintId } = req.query;
		let query = supabaseAdmin
			.from("sprint_reports")
			.select(REPORT_SELECT)
			.order("year", { ascending: false })
			.order("month", { ascending: false });

		if (sprintId) query = query.eq("sprint_id", sprintId);

		const { data, error } = await query;
		if (error) throw error;

		res.status(200).json({ success: true, count: data.length, data });
	} catch (error) {
		next(error);
	}
}

export async function getSprintReport(req, res, next) {
	try {
		const { id } = req.params;
		const { data, error } = await supabaseAdmin
			.from("sprint_reports")
			.select(REPORT_SELECT)
			.eq("id", id)
			.maybeSingle();
		if (error) throw error;
		if (!data) {
			return res
				.status(404)
				.json({ success: false, message: "Report not found." });
		}
		res.status(200).json({ success: true, data });
	} catch (error) {
		next(error);
	}
}

export async function uploadDevUpdateImage(req, res, next) {
	try {
		if (!isAdminOrManager(req.profile)) {
			return res.status(403).json({
				success: false,
				message: "Only admins and managers can upload screenshots.",
			});
		}

		const buffer = decodeDataUrl(req.body?.data);
		if (!buffer || buffer.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Image contents are required.",
			});
		}
		if (buffer.length > IMAGE_MAX_BYTES) {
			return res.status(400).json({
				success: false,
				message: "Image must be 10 MB or smaller.",
			});
		}

		const optimized = await sharp(buffer)
			.rotate()
			.resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		const result = await uploadImage(optimized, `${Date.now()}.webp`);

		const savings =
			buffer.length > 0
				? `${Math.round((1 - optimized.length / buffer.length) * 100)}%`
				: "0%";

		res.status(201).json({
			success: true,
			url: result.url,
			originalSize: buffer.length,
			optimizedSize: optimized.length,
			savings,
		});
	} catch (error) {
		if (error.statusCode) {
			return res
				.status(error.statusCode)
				.json({ success: false, message: error.message });
		}
		next(error);
	}
}
