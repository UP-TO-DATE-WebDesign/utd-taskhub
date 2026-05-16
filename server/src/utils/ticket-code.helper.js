// Preview the next ticket_code for a project (preview only).
// Uses the SQL `next_ticket_code` RPC so the computation matches the
// atomic allocation done by `create_ticket_atomic` on insert.
// NOTE: this value is advisory; the authoritative allocation happens
// inside `create_ticket_atomic` under an advisory xact lock.
export async function generateTicketCode(supabase, projectId) {
	const { data, error } = await supabase.rpc("next_ticket_code", {
		p_project_id: projectId,
	});

	if (error) throw error;
	if (!data) {
		throw new Error("Project key is missing; cannot generate ticket code.");
	}
	return data;
}

// Slugify project name into a candidate key. Caller picks unique suffix.
export function slugifyProjectKey(name) {
	const base = (name || "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 4);
	return base.length >= 2 ? base : "PRJ";
}

export async function generateUniqueProjectKey(supabase, name) {
	const base = slugifyProjectKey(name);
	let candidate = base;
	let suffix = 1;

	while (true) {
		const { data, error } = await supabase
			.from("projects")
			.select("id")
			.eq("key", candidate)
			.maybeSingle();
		if (error) throw error;
		if (!data) return candidate;
		const trimmed = base.slice(0, 3);
		candidate = `${trimmed}${suffix}`;
		suffix += 1;
		if (suffix > 9999) throw new Error("Could not allocate unique project key.");
	}
}
