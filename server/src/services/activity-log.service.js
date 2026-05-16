import { supabaseAdmin } from "../config/supabase.js";

const VALID_ENTITY_TYPES = new Set([
	"project",
	"board",
	"task",
	"ticket",
	"comment",
	"user",
	"project_member",
	"invitation",
]);

export async function logActivity({
	projectId,
	actorId,
	entityType,
	entityId,
	action,
	metadata = {},
}) {
	try {
		if (!projectId || !entityType || !entityId || !action) return;
		if (!VALID_ENTITY_TYPES.has(entityType)) {
			console.error(
				`[activity-log] invalid entityType: ${entityType}`,
			);
			return;
		}
		const { error } = await supabaseAdmin
			.from("activity_logs")
			.insert({
				project_id: projectId,
				actor_id: actorId ?? null,
				entity_type: entityType,
				entity_id: entityId,
				action,
				metadata: metadata ?? {},
			});
		if (error) {
			console.error("[activity-log] insert failed:", error.message);
		}
	} catch (e) {
		console.error("[activity-log] unexpected:", e?.message ?? e);
	}
}

export async function resolveProjectIdFromTaskOrTicket({
	taskId,
	ticketId,
}) {
	try {
		if (taskId) {
			const { data } = await supabaseAdmin
				.from("tasks")
				.select("project_id")
				.eq("id", taskId)
				.maybeSingle();
			return data?.project_id ?? null;
		}
		if (ticketId) {
			const { data } = await supabaseAdmin
				.from("tickets")
				.select("project_id")
				.eq("id", ticketId)
				.maybeSingle();
			return data?.project_id ?? null;
		}
	} catch (e) {
		console.error(
			"[activity-log] resolveProjectId failed:",
			e?.message ?? e,
		);
	}
	return null;
}
