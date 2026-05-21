import "../config/env.js";
import { supabase } from "../config/supabase.js";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const USERS = [
	{
		initials: "AR",
		full_name: "Alex Rivera",
		email: "joel.baluma@uptodatewebdesign.com",
		password: "5Ytk*|LYgJ[5qv!H",
		role: "admin",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Alex+Rivera",
	},
	{
		initials: "AM",
		full_name: "Alex Martinez",
		email: "alex.martinez@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Alex+Martinez",
	},
	{
		initials: "PR",
		full_name: "Paula Rodriguez",
		email: "paula.rodriguez@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Paula+Rodriguez",
	},
	{
		initials: "TS",
		full_name: "Tyler Smith",
		email: "tyler.smith@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Tyler+Smith",
	},
	{
		initials: "KL",
		full_name: "Kate Liu",
		email: "kate.liu@taskhub.dev",
		password: "@Taskhub2026!",
		role: "manager",
		avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Kate+Liu",
	},
	{
		initials: "JD",
		full_name: "Jordan Davis",
		email: "jordan.davis@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Jordan+Davis",
	},
	{
		initials: "DM",
		full_name: "Diego Morales",
		email: "diego.morales@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Diego+Morales",
	},
	{
		initials: "MN",
		full_name: "Maria Nguyen",
		email: "maria.nguyen@taskhub.dev",
		password: "@Taskhub2026!",
		role: "developer",
		avatar_url:
			"https://api.dicebear.com/9.x/initials/svg?seed=Maria+Nguyen",
	},
];

const PROJECTS = [
	{
		name: "Internal System",
		description:
			"Core architectural redesign and backend optimization for the centralized management system.",
		status: "in-progress",
		sprint_name: "Sprint 24 Delta",
		tags: ["Backend", "Infrastructure"],
		created_by: "AR",
	},
	{
		name: "Customer Portal",
		description:
			"Self-service portal for customers to manage subscriptions, view invoices, and submit support requests.",
		status: "in-progress",
		sprint_name: "Sprint 11 Beta",
		tags: ["Frontend", "UX"],
		created_by: "AR",
	},
	{
		name: "Data Pipeline v2",
		description:
			"Next-generation ETL pipeline replacing legacy batch jobs with real-time streaming using Kafka.",
		status: "planning",
		sprint_name: "Sprint 1 Alpha",
		tags: ["Data", "Backend"],
		created_by: "AR",
	},
	{
		name: "Mobile App",
		description:
			"React Native companion app for iOS and Android. Covers task management, notifications, and offline sync.",
		status: "completed",
		sprint_name: "Sprint 18 Final",
		tags: ["Mobile", "iOS", "Android"],
		created_by: "AR",
	},
	{
		name: "Design System",
		description:
			"Centralised component library and Figma token system. On hold while the brand refresh is finalised.",
		status: "on-hold",
		sprint_name: "Sprint 7 Gamma",
		tags: ["Design", "Frontend"],
		created_by: "AR",
	},
	{
		name: "Auth Service Rewrite",
		description:
			"Full rewrite of the authentication and authorisation layer. Migrating from legacy sessions to OAuth 2.0.",
		status: "in-progress",
		sprint_name: "Sprint 3 Epsilon",
		tags: ["Security", "Backend"],
		created_by: "AR",
	},
];

// Non-owner project members. AR is inserted as owner for all projects separately.
const PROJECT_MEMBERS = [
	{ project: "Internal System", user: "AM", role: "member" },
	{ project: "Internal System", user: "JD", role: "member" },
	{ project: "Internal System", user: "KL", role: "manager" },
	{ project: "Customer Portal", user: "KL", role: "manager" },
	{ project: "Customer Portal", user: "PR", role: "member" },
	{ project: "Data Pipeline v2", user: "TS", role: "member" },
	{ project: "Mobile App", user: "MN", role: "member" },
	{ project: "Mobile App", user: "KL", role: "member" },
	{ project: "Design System", user: "TS", role: "member" },
	{ project: "Auth Service Rewrite", user: "DM", role: "member" },
	{ project: "Auth Service Rewrite", user: "AM", role: "member" },
];

// tasks.status uses underscores; projects.status uses hyphens (schema constraint)
const TASKS = [
	// To Do
	{
		title: "Set up CI/CD pipeline",
		description:
			"Configure GitHub Actions workflows for automated build, test, and deployment to staging and production environments.",
		status: "todo",
		priority: "high",
		tags: ["DevOps"],
		project: "Internal System",
		due_date: "2026-05-12",
		assigned_to: "AM",
		position: 0,
	},
	{
		title: "Update API documentation",
		description:
			"Refresh OpenAPI spec to reflect recent endpoint changes. Add request/response examples for all invoice and subscription routes.",
		status: "todo",
		priority: "medium",
		tags: ["Docs"],
		project: "Customer Portal",
		due_date: "2026-05-15",
		assigned_to: "KL",
		position: 1,
	},
	{
		title: "User permission audit",
		description:
			"Review all role-based access control rules across the system. Identify any over-privileged accounts and document findings.",
		status: "todo",
		priority: "low",
		tags: ["Security"],
		project: "Internal System",
		due_date: "2026-05-20",
		assigned_to: "JD",
		position: 2,
	},
	{
		title: "Subscription upgrade flow",
		description:
			"Design and implement the UI flow for customers upgrading from free to paid plans. Includes plan comparison page and payment confirmation.",
		status: "todo",
		priority: "medium",
		tags: ["UX"],
		project: "Customer Portal",
		due_date: "2026-05-18",
		assigned_to: "PR",
		position: 3,
	},
	{
		title: "Kafka consumer group refactor",
		description:
			"Reorganise consumer groups to improve parallelism and reduce lag. Update offset management strategy to at-least-once semantics.",
		status: "todo",
		priority: "high",
		tags: ["Backend"],
		project: "Data Pipeline v2",
		due_date: "2026-05-22",
		assigned_to: "TS",
		position: 4,
	},
	// In Progress
	{
		title: "Refactor authentication middleware",
		description:
			"Break monolithic auth middleware into composable guards. Replace manual JWT parsing with a shared utility and add token rotation support.",
		status: "in-progress",
		priority: "urgent",
		tags: ["Security"],
		project: "Internal System",
		due_date: "2026-05-07",
		assigned_to: "AM",
		position: 0,
	},
	{
		title: "Invoice PDF export",
		description:
			"Generate downloadable PDF invoices from the billing portal using a server-side renderer. Support custom branding per account.",
		status: "in-progress",
		priority: "high",
		tags: ["Feature"],
		project: "Customer Portal",
		due_date: "2026-05-10",
		assigned_to: "PR",
		position: 1,
	},
	{
		title: "PKCE flow implementation",
		description:
			"Implement Proof Key for Code Exchange for all public OAuth clients. Replace implicit grant flow across mobile and SPA integrations.",
		status: "in-progress",
		priority: "high",
		tags: ["Security"],
		project: "Auth Service Rewrite",
		due_date: "2026-05-11",
		assigned_to: "DM",
		position: 2,
	},
	{
		title: "Database migration scripts",
		description:
			"Write idempotent SQL migration scripts for the schema changes in v2. Include rollback procedures and test against a production snapshot.",
		status: "in-progress",
		priority: "medium",
		tags: ["Backend"],
		project: "Internal System",
		due_date: "2026-05-24",
		assigned_to: "JD",
		position: 3,
	},
	{
		title: "Mobile offline sync",
		description:
			"Implement local-first data persistence using SQLite. Sync queued mutations to the server when connectivity is restored.",
		status: "in-progress",
		priority: "high",
		tags: ["Mobile"],
		project: "Mobile App",
		due_date: "2026-05-13",
		assigned_to: "MN",
		position: 4,
	},
	// Review
	{
		title: "API authentication layer",
		description:
			"Build a unified authentication layer that validates JWTs, checks scopes, and propagates user context to all downstream services.",
		status: "qa",
		priority: "high",
		tags: ["Security"],
		project: "Internal System",
		due_date: "2026-05-09",
		assigned_to: "AM",
		position: 0,
	},
	{
		title: "Session revocation endpoint",
		description:
			"Expose a POST /auth/revoke endpoint that invalidates active refresh tokens. Add to blocklist with a TTL matching the original expiry.",
		status: "qa",
		priority: "high",
		tags: ["Backend"],
		project: "Auth Service Rewrite",
		due_date: "2026-05-10",
		assigned_to: "DM",
		position: 1,
	},
	{
		title: "Accessibility audit fixes",
		description:
			"Address WCAG 2.1 AA violations found in the last audit. Focus on keyboard navigation, focus management, and ARIA labelling across all forms.",
		status: "qa",
		priority: "medium",
		tags: ["UX"],
		project: "Customer Portal",
		due_date: "2026-05-14",
		assigned_to: "PR",
		position: 2,
	},
	{
		title: "Component token documentation",
		description:
			"Document all design tokens in Storybook with live usage examples. Include token name, value, and which components consume each token.",
		status: "qa",
		priority: "low",
		tags: ["Design"],
		project: "Design System",
		due_date: "2026-05-16",
		assigned_to: "TS",
		position: 3,
	},
	// Done
	{
		title: "Login page redesign",
		description:
			"Redesigned the login and forgot-password pages to match the new brand guidelines. Improved error state copy and added OAuth provider buttons.",
		status: "done",
		priority: "high",
		tags: ["UX"],
		project: "Customer Portal",
		due_date: "2026-05-02",
		assigned_to: "PR",
		position: 0,
	},
	{
		title: "Push notification service",
		description:
			"Integrated Firebase Cloud Messaging for iOS and Android push notifications. Supports per-user topic subscriptions and silent background updates.",
		status: "done",
		priority: "medium",
		tags: ["Mobile"],
		project: "Mobile App",
		due_date: "2026-04-30",
		assigned_to: "KL",
		position: 1,
	},
	{
		title: "Rate limiter middleware",
		description:
			"Added sliding-window rate limiting to all public API routes using an in-memory store. Configurable per-route limits with 429 response and Retry-After header.",
		status: "done",
		priority: "high",
		tags: ["Backend"],
		project: "Internal System",
		due_date: "2026-05-01",
		assigned_to: "AM",
		position: 2,
	},
	{
		title: "Figma token export script",
		description:
			"Built a Node.js script that reads Figma Variables via the REST API and exports them as CSS custom properties and a JSON token file for the component library.",
		status: "done",
		priority: "low",
		tags: ["Design"],
		project: "Design System",
		due_date: "2026-04-28",
		assigned_to: "TS",
		position: 3,
	},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(phase, msg) {
	console.log(`[${phase}] ${msg}`);
}

function getArg(flag) {
	return process.argv.includes(flag);
}

function fail(phase, error) {
	const err =
		error instanceof Error
			? error
			: new Error(String(error?.message ?? error));
	err.seedPhase = phase;
	throw err;
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

async function checkAlreadySeeded() {
	const { data } = await supabase
		.from("profiles")
		.select("id")
		.eq("email", "alex.rivera@taskhub.dev")
		.maybeSingle();
	return data !== null;
}

async function seedUsers() {
	log("USERS", `Creating ${USERS.length} users...`);
	const userMap = new Map();

	for (const user of USERS) {
		const { data, error } = await supabase.auth.admin.createUser({
			email: user.email,
			password: user.password,
			email_confirm: true,
			user_metadata: { full_name: user.full_name },
		});
		if (error) fail("seedUsers", error);

		const userId = data.user.id;

		const { error: profileErr } = await supabase
			.from("profiles")
			.update({
				role: user.role,
				full_name: user.full_name,
				avatar_url: user.avatar_url,
			})
			.eq("id", userId);
		if (profileErr) fail("seedUsers:profileUpdate", profileErr);

		userMap.set(user.initials, userId);
		log("USERS", `  Created ${user.full_name} (${user.email})`);
	}

	return userMap;
}

async function seedProjects(userMap) {
	log("PROJECTS", `Inserting ${PROJECTS.length} projects...`);

	const rows = PROJECTS.map((p) => ({
		name: p.name,
		description: p.description,
		status: p.status,
		sprint_name: p.sprint_name,
		sprint_end_date: null,
		tags: p.tags,
		created_by: userMap.get(p.created_by),
	}));

	const { data, error } = await supabase
		.from("projects")
		.insert(rows)
		.select();
	if (error) fail("seedProjects", error);

	const projectMap = new Map(data.map((p) => [p.name, p.id]));

	// Insert AR as owner for all projects
	const arId = userMap.get("AR");
	const ownerRows = data.map((p) => ({
		project_id: p.id,
		user_id: arId,
		role: "owner",
	}));
	const { error: ownerErr } = await supabase
		.from("project_members")
		.insert(ownerRows);
	if (ownerErr) fail("seedProjects:ownerMembers", ownerErr);

	log("PROJECTS", `  Inserted ${data.length} projects + owner memberships`);
	return projectMap;
}

async function seedProjectMembers(userMap, projectMap) {
	log("MEMBERS", `Inserting ${PROJECT_MEMBERS.length} project members...`);

	const rows = PROJECT_MEMBERS.map((m) => ({
		project_id: projectMap.get(m.project),
		user_id: userMap.get(m.user),
		role: m.role,
	}));

	const { error } = await supabase.from("project_members").insert(rows);
	if (error) fail("seedProjectMembers", error);

	log("MEMBERS", `  Done`);
}

async function seedTasks(userMap, projectMap) {
	log("TASKS", `Inserting ${TASKS.length} tasks...`);

	const arId = userMap.get("AR");
	const rows = TASKS.map((t) => ({
		project_id: projectMap.get(t.project),
		title: t.title,
		description: t.description,
		status: t.status,
		priority: t.priority,
		tags: t.tags,
		due_date: t.due_date,
		assigned_to: userMap.get(t.assigned_to),
		created_by: arId,
		position: t.position,
		board_column_id: null,
	}));

	const { error } = await supabase.from("tasks").insert(rows);
	if (error) fail("seedTasks", error);

	log("TASKS", `  Done`);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

async function resetAll() {
	log("RESET", "Starting reset...");

	const emails = USERS.map((u) => u.email);
	const { data: profiles } = await supabase
		.from("profiles")
		.select("id, email")
		.in("email", emails);

	if (!profiles || profiles.length === 0) {
		log("RESET", "No seeded data found. Nothing to reset.");
		return;
	}

	const userIds = profiles.map((p) => p.id);

	await supabase.from("system_logs").delete().in("changed_by", userIds);
	log("RESET", `  Deleted system_logs`);

	const arProfile = profiles.find(
		(p) => p.email === "alex.rivera@taskhub.dev",
	);
	if (!arProfile) {
		log("RESET", "Admin user not found. Skipping project/task cleanup.");
	} else {
		const { data: projects } = await supabase
			.from("projects")
			.select("id")
			.eq("created_by", arProfile.id);

		const projectIds = (projects ?? []).map((p) => p.id);

		await supabase.from("tasks").delete().in("project_id", projectIds);
		log("RESET", `  Deleted tasks`);

		await supabase.from("sprints").delete().in("project_id", projectIds);
		log("RESET", `  Deleted sprints`);

		await supabase.from("invitations").delete().in("project_id", projectIds);
		log("RESET", `  Deleted invitations`);

		await supabase
			.from("project_members")
			.delete()
			.in("project_id", projectIds);
		log("RESET", `  Deleted project members`);

		await supabase.from("projects").delete().in("id", projectIds);
		log("RESET", `  Deleted ${projectIds.length} projects`);
	}

	await supabase.from("profiles").delete().in("id", userIds);
	log("RESET", `  Deleted profiles`);

	for (const profile of profiles) {
		const { error } = await supabase.auth.admin.deleteUser(profile.id);
		if (error)
			log(
				"RESET WARN",
				`  Could not delete user ${profile.email}: ${error.message}`,
			);
	}
	log("RESET", `  Deleted ${profiles.length} auth users`);
	log("RESET", "Reset complete.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	if (getArg("--reset")) {
		await resetAll();
		process.exit(0);
	}

	const alreadySeeded = await checkAlreadySeeded();
	if (alreadySeeded) {
		log(
			"SKIP",
			"Database already seeded. Run with --reset to clear first.",
		);
		process.exit(0);
	}

	const userMap = await seedUsers();
	const projectMap = await seedProjects(userMap);
	await seedProjectMembers(userMap, projectMap);
	await seedTasks(userMap, projectMap);

	log("DONE", "Seed completed successfully.");
	log("DONE", "Login: alex.rivera@taskhub.dev / Taskhub2024!");
}

main().catch((err) => {
	console.error(`\n[SEED ERROR] Phase: ${err.seedPhase ?? "unknown"}`);
	console.error(err.message);
	console.error("Run with --reset to clear partial data, then retry.");
	process.exit(1);
});
