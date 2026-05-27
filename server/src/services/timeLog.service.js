import { supabaseAdmin } from "../config/supabase.js";
import { findOrCreateCapacityRecord } from "./sprintCapacity.service.js";

export const TIME_LOG_SELECT = `
	id,
	task_id,
	user_id,
	sprint_id,
	duration_minutes,
	description,
	logged_date,
	created_at,
	updated_at,
	logged_by:profiles!time_logs_logged_by_fkey (
		id,
		full_name,
		email,
		avatar_url
	)
`;

export async function listTimeLogsForTask(client, taskId) {
	const { data, error } = await client
		.from("time_logs")
		.select(TIME_LOG_SELECT)
		.eq("task_id", taskId)
		.order("logged_date", { ascending: false })
		.order("created_at", { ascending: false });

	if (error) throw error;
	return data;
}

export async function getTimeLogById(client, logId) {
	const { data, error } = await client
		.from("time_logs")
		.select(TIME_LOG_SELECT)
		.eq("id", logId)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function createTimeLog(
	client,
	{
		taskId,
		userId,
		loggedBy,
		sprintId,
		durationMinutes,
		description,
		loggedDate,
	},
) {
	const { data, error } = await client
		.from("time_logs")
		.insert({
			task_id: taskId,
			user_id: userId,
			logged_by: loggedBy,
			sprint_id: sprintId ?? null,
			duration_minutes: durationMinutes,
			description: description ?? null,
			logged_date: loggedDate ?? new Date().toISOString().slice(0, 10),
		})
		.select(TIME_LOG_SELECT)
		.single();

	if (error) throw error;

	if (sprintId) {
		await refreshUserLoggedHours(userId, sprintId);
	}

	return data;
}

export async function updateTimeLog(client, logId, patch) {
	const existing = await getTimeLogById(client, logId);
	if (!existing) return null;

	const update = {};
	if (patch.durationMinutes !== undefined)
		update.duration_minutes = patch.durationMinutes;
	if (patch.description !== undefined) update.description = patch.description;
	if (patch.loggedDate !== undefined) update.logged_date = patch.loggedDate;
	update.updated_at = new Date().toISOString();

	const { data, error } = await client
		.from("time_logs")
		.update(update)
		.eq("id", logId)
		.select(TIME_LOG_SELECT)
		.single();

	if (error) throw error;

	if (existing.sprint_id) {
		await refreshUserLoggedHours(existing.user_id, existing.sprint_id);
	}

	return data;
}

export async function deleteTimeLog(client, logId) {
	const existing = await getTimeLogById(client, logId);
	if (!existing) return null;

	const { error } = await client.from("time_logs").delete().eq("id", logId);
	if (error) throw error;

	if (existing.sprint_id) {
		await refreshUserLoggedHours(existing.user_id, existing.sprint_id);
	}

	return existing;
}

export async function calculateLoggedHours(userId, sprintId) {
	const { data, error } = await supabaseAdmin
		.from("time_logs")
		.select("duration_minutes")
		.eq("user_id", userId)
		.eq("sprint_id", sprintId);

	if (error) throw error;
	const totalMinutes = (data || []).reduce(
		(sum, row) => sum + (row.duration_minutes || 0),
		0,
	);
	return totalMinutes / 60;
}

export async function refreshUserLoggedHours(userId, sprintId) {
	await findOrCreateCapacityRecord(supabaseAdmin, userId, sprintId);
	const loggedHours = await calculateLoggedHours(userId, sprintId);

	const { error } = await supabaseAdmin
		.from("user_sprint_capacity")
		.update({
			logged_hours: Number(loggedHours.toFixed(2)),
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", userId)
		.eq("sprint_id", sprintId);

	if (error) throw error;
	return loggedHours;
}
