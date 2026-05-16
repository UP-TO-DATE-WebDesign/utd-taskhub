import { supabaseAdmin } from "../config/supabase.js";

const VALID_ENTITY_TYPES = [
	"project",
	"board",
	"task",
	"ticket",
	"comment",
	"user",
	"project_member",
	"invitation",
];

const SYSTEM_TABLES_OTHER = [
	"tasks",
	"tickets",
	"boards",
	"project_members",
	"sprints",
];

const PROFILE_FIELDS = "id, full_name, email, avatar_url";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const SOURCE_CAP = 1000;

function tableToEntityType(table) {
	switch (table) {
		case "projects":
			return "project";
		case "tasks":
			return "task";
		case "tickets":
			return "ticket";
		case "boards":
			return "board";
		case "project_members":
			return "project_member";
		case "sprints":
			return "project";
		default:
			return "project";
	}
}

function systemActionTag(action, table) {
	const verb =
		action === "INSERT"
			? "created"
			: action === "UPDATE"
				? "updated"
				: "deleted";
	return `${tableToEntityType(table)}.${verb}`;
}

const IGNORE_DIFF_KEYS = new Set([
	"updated_at",
	"created_at",
	"position",
	"closed_at",
]);

function changedFields(oldData, newData) {
	if (!oldData || !newData) return [];
	const keys = new Set([
		...Object.keys(oldData),
		...Object.keys(newData),
	]);
	const changed = [];
	for (const k of keys) {
		if (IGNORE_DIFF_KEYS.has(k)) continue;
		if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) {
			changed.push(k);
		}
	}
	return changed;
}

function normalizeActivityLog(row) {
	return {
		id: row.id,
		source: "activity_logs",
		project_id: row.project_id,
		actor: row.actor ?? null,
		entity_type: row.entity_type,
		entity_id: row.entity_id,
		action: row.action,
		metadata: row.metadata ?? {},
		created_at: row.created_at,
	};
}

function normalizeSystemLog(row) {
	const newData = row.new_data ?? {};
	const oldData = row.old_data ?? {};
	const projectId =
		newData.project_id ??
		oldData.project_id ??
		(row.table_name === "projects" ? row.record_id : null);
	return {
		id: `sys:${row.id}`,
		source: "system_logs",
		project_id: projectId,
		actor: row.changer ?? null,
		entity_type: tableToEntityType(row.table_name),
		entity_id: row.record_id,
		action: systemActionTag(row.action, row.table_name),
		metadata: {
			legacy: true,
			table_name: row.table_name,
			changed_fields:
				row.action === "UPDATE"
					? changedFields(oldData, newData)
					: [],
			title: newData.title ?? oldData.title ?? null,
			name: newData.name ?? oldData.name ?? null,
			ticket_code:
				newData.ticket_code ?? oldData.ticket_code ?? null,
			status: newData.status ?? oldData.status ?? null,
			user_id: newData.user_id ?? oldData.user_id ?? null,
			role: newData.role ?? oldData.role ?? null,
		},
		created_at: row.changed_at,
	};
}

export async function listProjectActivity(req, res, next) {
	try {
		const { id: projectId } = req.params;

		const rawPage = parseInt(req.query.page, 10);
		const rawLimit = parseInt(req.query.limit, 10);
		const page = rawPage > 0 ? rawPage : 1;
		const limit =
			rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

		const { entityType, action, fromDate, toDate } = req.query;

		if (entityType && !VALID_ENTITY_TYPES.includes(entityType)) {
			return res.status(400).json({
				success: false,
				message: `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}.`,
			});
		}

		// --- Query A: activity_logs ---------------------------------
		let activityQuery = supabaseAdmin
			.from("activity_logs")
			.select(
				`id, project_id, entity_type, entity_id, action, metadata, created_at, ` +
					`actor:profiles!activity_logs_actor_id_fkey(${PROFILE_FIELDS})`,
			)
			.eq("project_id", projectId)
			.order("created_at", { ascending: false })
			.limit(SOURCE_CAP);

		if (entityType) activityQuery = activityQuery.eq("entity_type", entityType);
		if (action) activityQuery = activityQuery.eq("action", action);
		if (fromDate) activityQuery = activityQuery.gte("created_at", fromDate);
		if (toDate) activityQuery = activityQuery.lte("created_at", toDate);

		// --- Query B1: system_logs for the project row itself --------
		const sysSelect =
			`id, action, table_name, record_id, old_data, new_data, changed_at, ` +
			`changer:profiles!system_logs_changed_by_fkey(${PROFILE_FIELDS})`;

		let sysProjectsQuery = supabaseAdmin
			.from("system_logs")
			.select(sysSelect)
			.eq("table_name", "projects")
			.eq("record_id", projectId)
			.order("changed_at", { ascending: false })
			.limit(SOURCE_CAP);
		if (fromDate) sysProjectsQuery = sysProjectsQuery.gte("changed_at", fromDate);
		if (toDate) sysProjectsQuery = sysProjectsQuery.lte("changed_at", toDate);

		// --- Query B2: system_logs scoped by JSONB new_data.project_id ---
		let sysNewQuery = supabaseAdmin
			.from("system_logs")
			.select(sysSelect)
			.in("table_name", SYSTEM_TABLES_OTHER)
			.eq("new_data->>project_id", projectId)
			.order("changed_at", { ascending: false })
			.limit(SOURCE_CAP);
		if (fromDate) sysNewQuery = sysNewQuery.gte("changed_at", fromDate);
		if (toDate) sysNewQuery = sysNewQuery.lte("changed_at", toDate);

		// --- Query B3: system_logs scoped by JSONB old_data.project_id (deletes) ---
		let sysOldQuery = supabaseAdmin
			.from("system_logs")
			.select(sysSelect)
			.in("table_name", SYSTEM_TABLES_OTHER)
			.eq("old_data->>project_id", projectId)
			.eq("action", "DELETE")
			.order("changed_at", { ascending: false })
			.limit(SOURCE_CAP);
		if (fromDate) sysOldQuery = sysOldQuery.gte("changed_at", fromDate);
		if (toDate) sysOldQuery = sysOldQuery.lte("changed_at", toDate);

		const [aRes, pRes, nRes, oRes] = await Promise.all([
			activityQuery,
			sysProjectsQuery,
			sysNewQuery,
			sysOldQuery,
		]);

		if (aRes.error) throw aRes.error;
		if (pRes.error) throw pRes.error;
		if (nRes.error) throw nRes.error;
		if (oRes.error) throw oRes.error;

		const seen = new Set();
		const merged = [];

		for (const r of aRes.data ?? []) {
			const n = normalizeActivityLog(r);
			if (seen.has(n.id)) continue;
			seen.add(n.id);
			merged.push(n);
		}

		const sysAll = [
			...(pRes.data ?? []),
			...(nRes.data ?? []),
			...(oRes.data ?? []),
		];
		for (const r of sysAll) {
			const n = normalizeSystemLog(r);
			if (entityType && n.entity_type !== entityType) continue;
			if (action && n.action !== action) continue;
			if (seen.has(n.id)) continue;
			seen.add(n.id);
			merged.push(n);
		}

		merged.sort((a, b) =>
			a.created_at < b.created_at
				? 1
				: a.created_at > b.created_at
					? -1
					: 0,
		);

		const total = merged.length;
		const from = (page - 1) * limit;
		const to = from + limit;
		const sliced = merged.slice(from, to);

		res.status(200).json({
			success: true,
			count: total,
			page,
			limit,
			totalPages: Math.max(1, Math.ceil(total / limit)),
			data: sliced,
		});
	} catch (error) {
		next(error);
	}
}
