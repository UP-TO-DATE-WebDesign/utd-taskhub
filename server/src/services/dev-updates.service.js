import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env.js";

// Outbound client for the external "Dev Updates & Reports API".
// TaskHub is a consumer: it pushes sprint dev updates and pulls AI reports.

function client() {
	if (!env.devUpdatesApiToken) {
		throw new Error(
			"DEV_UPDATES_API_TOKEN is not configured; cannot call Dev Updates API.",
		);
	}
	return axios.create({
		baseURL: env.devUpdatesApiUrl,
		timeout: 30000,
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${env.devUpdatesApiToken}`,
		},
	});
}

function normalizeError(error, action) {
	const message =
		error.response?.data?.message ||
		error.message ||
		`Dev Updates API request failed (${action})`;
	return {
		status: error.response?.status || 502,
		message,
		data: error.response?.data || null,
	};
}

export async function bulkImportUpdates(updates) {
	if (!Array.isArray(updates) || updates.length === 0) {
		return { success: true, count: 0 };
	}
	try {
		const { data } = await client().post("/bulk-import", { updates });
		return data;
	} catch (error) {
		throw normalizeError(error, "bulk-import");
	}
}

export async function listUpdates(params = {}) {
	try {
		const { app, type, search, page, limit } = params;
		const { data } = await client().get("/", {
			params: { app, type, search, page, limit },
		});
		return data;
	} catch (error) {
		throw normalizeError(error, "list-updates");
	}
}

export async function generateReport(month, year) {
	try {
		const { data } = await client().post("/generate-report", {
			month,
			year,
		});
		return data;
	} catch (error) {
		throw normalizeError(error, "generate-report");
	}
}

export async function uploadImage(buffer, filename) {
	try {
		const form = new FormData();
		form.append("image", buffer, {
			filename,
			contentType: "image/webp",
		});
		const { data } = await client().post("/upload-image", form, {
			headers: form.getHeaders(),
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
		});
		return data;
	} catch (error) {
		throw normalizeError(error, "upload-image");
	}
}
