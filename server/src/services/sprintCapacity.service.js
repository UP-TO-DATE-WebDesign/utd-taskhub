import { supabaseAdmin } from "../config/supabase.js";

export async function getActiveSprint(client) {
	const { data, error } = await client
		.from("sprints")
		.select("id, name, start_date, end_date, status")
		.eq("status", "active")
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function findOrCreateCapacityRecord(client, userId, sprintId) {
	// Insert only if not exists — preserves existing capacity_hours on conflict
	await client
		.from("user_sprint_capacity")
		.upsert(
			{
				user_id: userId,
				sprint_id: sprintId,
				capacity_hours: 40,
				assigned_hours: 0,
			},
			{ onConflict: "user_id,sprint_id", ignoreDuplicates: true },
		);

	const { data, error } = await client
		.from("user_sprint_capacity")
		.select("*")
		.eq("user_id", userId)
		.eq("sprint_id", sprintId)
		.single();

	if (error) throw error;
	return data;
}

export async function calculateAssignedHours(client, userId, sprintId) {
	const { data, error } = await client
		.from("tasks")
		.select("estimated_time")
		.eq("assigned_to", userId)
		.eq("sprint_id", sprintId)
		.neq("status", "cancelled");

	if (error) throw error;
	return (data || []).reduce(
		(sum, t) => sum + (t.estimated_time / 60 || 0),
		0,
	);
}

export async function refreshUserCapacity(client, userId, sprintId) {
	await findOrCreateCapacityRecord(client, userId, sprintId);
	const assignedHours = await calculateAssignedHours(
		client,
		userId,
		sprintId,
	);

	const { error } = await client
		.from("user_sprint_capacity")
		.update({
			assigned_hours: assignedHours,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", userId)
		.eq("sprint_id", sprintId);

	if (error) throw error;
}

export async function calculateLoggedHours(client, userId, sprintId) {
	const { data, error } = await client
		.from("time_logs")
		.select("duration_minutes")
		.eq("user_id", userId)
		.eq("sprint_id", sprintId);

	if (error) throw error;
	return (data || []).reduce(
		(sum, row) => sum + (row.duration_minutes || 0) / 60,
		0,
	);
}

export async function getCapacitySummary(client, userId) {
	const sprint = await getActiveSprint(client);
	if (!sprint) return null;

	const record = await findOrCreateCapacityRecord(client, userId, sprint.id);
	const assignedHours = await calculateAssignedHours(
		client,
		userId,
		sprint.id,
	);
	const loggedHours = await calculateLoggedHours(client, userId, sprint.id);

	return {
		userId,
		sprintId: sprint.id,
		sprintName: sprint.name,
		sprintStart: sprint.start_date,
		sprintEnd: sprint.end_date,
		capacityHours: record.capacity_hours,
		assignedHours,
		loggedHours,
		remainingHours: record.capacity_hours - assignedHours,
		isOverbooked: assignedHours > record.capacity_hours,
	};
}
