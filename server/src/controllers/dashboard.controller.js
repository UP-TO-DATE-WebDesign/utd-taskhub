export async function getDashboard(req, res, next) {
	try {
		const userId = req.user.id;
		const today = new Date().toISOString().split("T")[0];

		// All tasks assigned to current user
		const { data: allTasks, error: tasksError } = await req.supabase
			.from("tasks")
			.select("id, title, status, due_date, project:projects(name)")
			.eq("assigned_to", userId)
			.order("created_at", { ascending: false });

		if (tasksError) throw tasksError;

		const tasks = allTasks ?? [];
		const activeTasks = tasks.filter(
			(t) => t.status !== "done" && t.status !== "cancelled",
		);

		const stats = {
			my_tasks: activeTasks.length,
			in_progress: tasks.filter((t) => t.status === "in-progress").length,
			for_review: tasks.filter((t) => t.status === "qa").length,
			completed: tasks.filter((t) => t.status === "done").length,
			overdue: activeTasks.filter((t) => t.due_date && t.due_date < today)
				.length,
			open_tickets: 0,
		};

		const recent_tasks = activeTasks.slice(0, 5);

		// Projects the user belongs to
		const { data: memberRows, error: membersError } = await req.supabase
			.from("project_members")
			.select("project_id")
			.eq("user_id", userId);

		if (membersError) throw membersError;

		const projectIds = (memberRows ?? []).map((r) => r.project_id);
		let recent_tickets = [];
		let active_sprint = null;

		const { data: activeSprintRow, error: activeSprintError } =
			await req.supabase
				.from("sprints")
				.select("id, name, start_date, end_date, status")
				.eq("status", "active")
				.order("start_date", { ascending: false })
				.limit(1)
				.maybeSingle();

		if (activeSprintError) throw activeSprintError;

		if (activeSprintRow) {
			let sprintTasks = [];

			if (projectIds.length > 0) {
				const { data: sprintTaskRows, error: sprintTasksError } =
					await req.supabase
						.from("tasks")
						.select("id, status")
						.eq("sprint_id", activeSprintRow.id)
						.in("project_id", projectIds);

				if (sprintTasksError) throw sprintTasksError;
				sprintTasks = sprintTaskRows ?? [];
			}

			const totalTasks = sprintTasks.length;
			const completedTasks = sprintTasks.filter(
				(t) => t.status === "done",
			).length;
			const openTasks = sprintTasks.filter(
				(t) => t.status !== "done" && t.status !== "cancelled",
			).length;

			active_sprint = {
				...activeSprintRow,
				total_tasks: totalTasks,
				completed_tasks: completedTasks,
				open_tasks: openTasks,
				progress:
					totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
			};
		}

		if (projectIds.length > 0) {
			const { count: ticketCount, error: countError } = await req.supabase
				.from("tickets")
				.select("id", { count: "exact", head: true })
				.in("project_id", projectIds)
				.in("status", ["open", "in_review"]);

			if (countError) throw countError;
			stats.open_tickets = ticketCount ?? 0;

			const { data: ticketRows, error: ticketsError } = await req.supabase
				.from("tickets")
				.select(
					"id, title, type, status, created_at, created_by:profiles!tickets_created_by_fkey(full_name)",
				)
				.in("project_id", projectIds)
				.in("status", ["open", "in_review"])
				.order("created_at", { ascending: false })
				.limit(5);

			if (ticketsError) throw ticketsError;
			recent_tickets = ticketRows ?? [];
		}

		res.json({
			success: true,
			data: { stats, active_sprint, recent_tasks, recent_tickets },
		});
	} catch (err) {
		next(err);
	}
}
