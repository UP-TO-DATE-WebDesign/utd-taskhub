import { useState } from "react";
import {
	CheckCircle2,
	Circle,
	MessageSquare,
	ShieldCheck,
	Ticket,
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	MoreVertical,
	Bug,
	CalendarDays,
	KeyRound,
	Moon,
	Target,
	Timer,
	Zap,
	BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import {
	getAdminReports,
	type AdminReportPayload,
} from "@/services/admin-report.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
	getDashboard,
	type DashboardData,
	type DashboardTicket,
} from "@/services/dashboard.service";
import SkeletonLoader from "@/components/ui/skeleton-loader";
import { useApiSWR } from "@/hooks/useApiSWR";

const STATUS_DOT: Record<string, string> = {
	in_progress: "bg-primary",
	review: "bg-accent",
	todo: "bg-secondary",
	backlog: "bg-secondary",
};

const TICKET_TYPE_META: Record<
	string,
	{ icon: React.ElementType; iconBg: string; iconClass: string }
> = {
	bug: { icon: Bug, iconBg: "bg-danger-subtle", iconClass: "text-danger" },
	feature_request: {
		icon: Zap,
		iconBg: "bg-primary-subtle",
		iconClass: "text-primary",
	},
	issue: { icon: Moon, iconBg: "bg-accent-subtle", iconClass: "text-accent" },
	support: {
		icon: KeyRound,
		iconBg: "bg-accent-subtle",
		iconClass: "text-accent",
	},
	other: { icon: Ticket, iconBg: "bg-muted-subtle", iconClass: "text-muted" },
};

function formatDue(dateStr: string | null): string {
	if (!dateStr) return "—";
	const d = new Date(dateStr);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const diff = Math.round(
		(d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diff === 0) return "Today";
	if (diff === 1) return "Tomorrow";
	if (diff === -1) return "Yesterday";
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toLocalDate(dateStr: string): Date {
	return new Date(`${dateStr}T00:00:00`);
}

function formatSprintDate(dateStr: string): string {
	return toLocalDate(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function formatSprintRange(startDate: string, endDate: string): string {
	return `${formatSprintDate(startDate)} - ${formatSprintDate(endDate)}`;
}

function formatSprintTimeLeft(endDate: string): string {
	const end = toLocalDate(endDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const days = Math.ceil(
		(end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (days < 0) return "Past due";
	if (days === 0) return "Ends today";
	if (days === 1) return "1 day left";
	return `${days} days left`;
}

export default function DashboardPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { can } = usePermission();
	const isAdmin = can("Workspace settings");
	const [sortKey, setSortKey] = useState<
		"title" | "project" | "due_date" | "status"
	>("due_date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	const toggleSort = (key: typeof sortKey) => {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

	const {
		data,
		error: dashboardError,
		isLoading: loading,
	} = useApiSWR<DashboardData>(["dashboard"], () => getDashboard());

	const error = dashboardError ? dashboardError.message : null;

	const { data: reportsPayload, isLoading: reportsLoading } =
		useApiSWR<AdminReportPayload>(
			isAdmin ? ["admin-reports"] : null,
			() => getAdminReports(),
		);
	const reportsSummary = reportsPayload?.projectStatusSummary ?? null;

	const firstName = user?.full_name?.split(" ")[0] ?? "there";

	if (loading)
		return (
			<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
				{/* Header */}
				<div className="flex items-start justify-between mb-8">
					<div>
						<h1 className="text-3xl font-semibold text-foreground tracking-tight">
							System Overview
						</h1>
						<p className="text-sm text-muted mt-1">
							Hello {firstName}, here is what requires your
							attention today.
						</p>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, index) => (
						<div
							key={index}
							className="rounded-2xl border border-slate-200 bg-white p-5"
						>
							<div className="mb-6 flex items-center justify-between">
								<SkeletonLoader className="h-4 w-24" />
								<SkeletonLoader className="h-7 w-7 rounded-full" />
							</div>

							<SkeletonLoader className="h-9 w-14" />
						</div>
					))}
				</div>

				{/* Main Content */}
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
					<div className="space-y-6">
						{/* Recent Tasks Card */}
						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
							<div className="flex items-center justify-between border-b border-slate-200 p-6">
								<SkeletonLoader className="h-6 w-36" />
								<SkeletonLoader className="h-5 w-16" />
							</div>

							<div className="grid grid-cols-4 gap-4 border-b border-slate-200 px-6 py-4">
								<SkeletonLoader className="h-4 w-32" />
								<SkeletonLoader className="h-4 w-20" />
								<SkeletonLoader className="h-4 w-16" />
								<SkeletonLoader className="h-4 w-20" />
							</div>

							<div className="flex h-24 items-center justify-center">
								<SkeletonLoader className="h-5 w-36" />
							</div>
						</div>

						{/* Tasks by Status Card */}
						<div className="rounded-2xl border border-slate-200 bg-white p-6">
							<SkeletonLoader className="mb-8 h-6 w-40" />

							<div className="space-y-6">
								{Array.from({ length: 4 }).map((_, index) => (
									<div key={index}>
										<div className="mb-3 flex items-center justify-between">
											<SkeletonLoader className="h-5 w-28" />
											<SkeletonLoader className="h-5 w-5" />
										</div>

										<SkeletonLoader className="h-2 w-full rounded-full" />
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Tickets Card */}
					<div className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
						<div className="mb-10 flex items-center justify-between">
							<SkeletonLoader className="h-6 w-20" />
							<SkeletonLoader className="h-6 w-6 rounded-full" />
						</div>

						<div className="mb-10 flex justify-center">
							<SkeletonLoader className="h-5 w-32" />
						</div>

						<SkeletonLoader className="h-11 w-full rounded-full" />
					</div>
				</div>
			</div>
		);
	if (error) return <div className="p-8 text-sm text-danger">{error}</div>;
	if (!data) return null;

	const { stats, active_sprint, recent_tasks, recent_tickets } = data;

	const sortedRecentTasks = [...recent_tasks].sort((a, b) => {
		const dir = sortDir === "asc" ? 1 : -1;
		const av =
			sortKey === "project"
				? (a.project?.name ?? "")
				: sortKey === "due_date"
					? (a.due_date ?? "")
					: (a[sortKey] ?? "");
		const bv =
			sortKey === "project"
				? (b.project?.name ?? "")
				: sortKey === "due_date"
					? (b.due_date ?? "")
					: (b[sortKey] ?? "");
		return String(av).localeCompare(String(bv)) * dir;
	});

	const statCards = [
		{
			label: "My Tasks",
			value: stats.my_tasks,
			icon: CheckCircle2,
			iconClass: "text-primary",
		},
		{
			label: "In Progress",
			value: stats.in_progress,
			icon: Circle,
			iconClass: "text-primary",
		},
		{
			label: "For Review",
			value: stats.for_review,
			icon: MessageSquare,
			iconClass: "text-accent",
		},
		{
			label: "Completed",
			value: stats.completed,
			icon: ShieldCheck,
			iconClass: "text-secondary",
		},
		{
			label: "Open Tickets",
			value: stats.open_tickets,
			icon: Ticket,
			iconClass: "text-muted",
		},
		{
			label: "Overdue",
			value: stats.overdue,
			icon: AlertTriangle,
			iconClass: "text-danger",
			valueClass: "text-danger",
		},
	];

	const total = stats.my_tasks + stats.completed;
	const statusBars = [
		{
			label: "In Progress",
			count: stats.in_progress,
			barClass: "bg-primary",
		},
		{
			label: "For Review",
			count: stats.for_review,
			barClass: "bg-accent",
		},
		{
			label: "Completed",
			count: stats.completed,
			barClass: "bg-secondary",
		},
		{ label: "Overdue", count: stats.overdue, barClass: "bg-danger" },
	];

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Page header */}
			<div className="flex items-start justify-between mb-8">
				<div>
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						System Overview
					</h1>
					<p className="text-sm text-muted mt-1">
						Hello {firstName}, here is what requires your attention
						today.
					</p>
				</div>
			</div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
				{statCards.map((s) => (
					<Card key={s.label} className="p-4">
						<p className="text-xs text-muted mb-3">{s.label}</p>
						<div className="flex items-center justify-between">
							<span
								className={`text-3xl font-bold tabular-nums ${s.valueClass ?? "text-foreground"}`}
							>
								{String(s.value).padStart(2, "")}
							</span>
							<s.icon className={`h-6 w-6 ${s.iconClass}`} />
						</div>
					</Card>
				))}
			</div>

			{/* Main content: left + right columns */}
			<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
				{/* LEFT */}

				<div className="flex flex-col gap-6">
					{/* Active Sprint */}
					<Card className="p-5">
						<div className="mb-5 flex items-center justify-between">
							<div>
								<h2 className="text-base font-semibold text-foreground">
									Active Sprint
								</h2>
								<p className="mt-1 text-xs text-muted">
									Current sprint progress
								</p>
							</div>
							<Badge
								variant={
									active_sprint ? "in-progress" : "default"
								}
							>
								{active_sprint ? "Active" : "None"}
							</Badge>
						</div>

						{active_sprint ? (
							<div className="space-y-5">
								<div>
									<p className="text-lg font-semibold leading-tight text-foreground">
										{active_sprint.name}
									</p>
									<div className="mt-2 flex items-center gap-2 text-sm text-muted">
										<CalendarDays className="h-4 w-4" />
										<span>
											{formatSprintRange(
												active_sprint.start_date,
												active_sprint.end_date,
											)}
										</span>
									</div>
								</div>

								<div>
									<div className="mb-2 flex items-center justify-between">
										<span className="text-sm text-muted">
											Progress
										</span>
										<span className="text-sm font-semibold text-foreground">
											{active_sprint.progress}%
										</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-border">
										<div
											className="h-full rounded-full bg-primary transition-all"
											style={{
												width: `${active_sprint.progress}%`,
											}}
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-lg border border-border p-3">
										<div className="mb-2 flex items-center gap-2 text-xs text-muted">
											<Target className="h-4 w-4" />
											<span>Tasks</span>
										</div>
										<p className="text-sm font-semibold text-foreground">
											{active_sprint.completed_tasks}/
											{active_sprint.total_tasks} done
										</p>
									</div>
									<div className="rounded-lg border border-border p-3">
										<div className="mb-2 flex items-center gap-2 text-xs text-muted">
											<Timer className="h-4 w-4" />
											<span>Remaining</span>
										</div>
										<p className="text-sm font-semibold text-foreground">
											{formatSprintTimeLeft(
												active_sprint.end_date,
											)}
										</p>
									</div>
								</div>

								<p className="text-xs text-muted">
									{active_sprint.open_tasks} open tasks in
									your projects
								</p>
							</div>
						) : (
							<div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
								<p className="text-sm font-medium text-foreground">
									No active sprint
								</p>
								<p className="mt-1 text-xs text-muted">
									Start a sprint to track weekly progress
									here.
								</p>
							</div>
						)}
					</Card>

					{/* Tickets */}
					<Card className="p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-base font-semibold text-foreground">
								Tickets
							</h2>
							<button className="text-muted hover:text-foreground p-1 rounded transition-colors">
								<MoreVertical className="h-4 w-4" />
							</button>
						</div>
						<div className="space-y-4">
							{recent_tickets.length === 0 ? (
								<p className="text-sm text-muted text-center py-2">
									No open tickets
								</p>
							) : (
								recent_tickets.map((t: DashboardTicket) => {
									const meta =
										TICKET_TYPE_META[t.type] ??
										TICKET_TYPE_META.other;
									return (
										<div
											key={t.id}
											className="flex items-start gap-3"
										>
											<div
												className={`h-9 w-9 rounded-full ${meta.iconBg} flex items-center justify-center shrink-0`}
											>
												<meta.icon
													className={`h-4 w-4 ${meta.iconClass}`}
												/>
											</div>
											<div>
												<p className="text-sm font-medium text-foreground leading-tight">
													{t.title}
												</p>
												<p className="text-xs text-muted mt-0.5">
													#{t.id.slice(0, 8)} &bull;{" "}
													{t.created_by?.full_name ??
														"Unknown"}
												</p>
											</div>
										</div>
									);
								})
							)}
						</div>
						<Button
							variant="outline"
							className="w-full mt-5 text-sm"
							onClick={() => navigate("/tickets")}
						>
							Manage Tickets
						</Button>
					</Card>
				</div>

				{/* RIGHT */}
				<div className="flex flex-col gap-6">
					{/* Recent Tasks */}
					<Card className="p-0 overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-border">
							<h2 className="text-base font-semibold text-foreground">
								Recent Tasks
							</h2>
							<button
								onClick={() => navigate("/tasks")}
								className="text-sm text-primary font-medium hover:underline"
							>
								View All
							</button>
						</div>
						<div className="overflow-x-auto">
						<table className="min-w-[520px] w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									<th
										onClick={() => toggleSort("title")}
										className="px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left cursor-pointer select-none"
									>
										<span className="inline-flex items-center gap-1">
											Task Description
											{sortKey === "title" &&
												(sortDir === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : (
													<ArrowDown className="h-3 w-3" />
												))}
										</span>
									</th>
									<th
										onClick={() => toggleSort("project")}
										className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left cursor-pointer select-none"
									>
										<span className="inline-flex items-center gap-1">
											Project
											{sortKey === "project" &&
												(sortDir === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : (
													<ArrowDown className="h-3 w-3" />
												))}
										</span>
									</th>
									<th
										onClick={() => toggleSort("due_date")}
										className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left cursor-pointer select-none"
									>
										<span className="inline-flex items-center gap-1">
											Due
											{sortKey === "due_date" &&
												(sortDir === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : (
													<ArrowDown className="h-3 w-3" />
												))}
										</span>
									</th>
									<th
										onClick={() => toggleSort("status")}
										className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left cursor-pointer select-none"
									>
										<span className="inline-flex items-center gap-1">
											Status
											{sortKey === "status" &&
												(sortDir === "asc" ? (
													<ArrowUp className="h-3 w-3" />
												) : (
													<ArrowDown className="h-3 w-3" />
												))}
										</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{sortedRecentTasks.length === 0 ? (
									<tr>
										<td
											colSpan={4}
											className="px-5 py-6 text-sm text-muted text-center"
										>
											No active tasks
										</td>
									</tr>
								) : (
									sortedRecentTasks.map((task) => (
										<tr
											key={task.id}
											className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
										>
											<td className="px-5 py-4">
												<div className="flex items-center gap-2.5">
													<span
														className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-muted"}`}
													/>
													<span className="text-sm font-medium text-foreground">
														{task.title}
													</span>
												</div>
											</td>
											<td className="px-4 py-4 text-sm text-muted-foreground">
												{task.project?.name ?? "—"}
											</td>
											<td className="px-4 py-4 text-sm text-muted-foreground">
												{formatDue(task.due_date)}
											</td>
											<td className="px-4 py-4">
												<Badge
													variant={
														task.status as never
													}
												>
													{task.status.replace(
														"_",
														" ",
													)}
												</Badge>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
						</div>
					</Card>

					{/* Tasks by Status */}
					<Card className="p-5">
						<h2 className="text-base font-semibold text-foreground mb-5">
							Tasks by Status
						</h2>
						<div className="space-y-4">
							{statusBars.map((item) => {
								const pct =
									total > 0
										? Math.round((item.count / total) * 100)
										: 0;
								return (
									<div key={item.label}>
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-sm text-foreground">
												{item.label}
											</span>
											<span className="text-sm font-medium text-foreground">
												{item.count}
											</span>
										</div>
										<div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
											<div
												className={`h-full ${item.barClass} rounded-full transition-all`}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</Card>

					{/* Reports Summary (admin only) */}
					{isAdmin && (
						<Card className="p-5">
							<div className="mb-5 flex items-start justify-between">
								<div className="flex items-center gap-2">
									<BarChart3 className="h-4 w-4 text-primary" />
									<h2 className="text-base font-semibold text-foreground">
										Reports Summary
									</h2>
								</div>
							</div>

							{reportsLoading && (
								<div className="space-y-3">
									<SkeletonLoader className="h-4 w-full" />
									<SkeletonLoader className="h-4 w-full" />
									<SkeletonLoader className="h-4 w-full" />
									<SkeletonLoader className="h-2 w-full rounded-full" />
								</div>
							)}

							{!reportsLoading && reportsSummary && (
								<>
									<div className="space-y-4">
										{[
											{
												label: "On Track",
												count: reportsSummary.totals.onTrack,
												barClass: "bg-secondary",
											},
											{
												label: "At Risk",
												count: reportsSummary.totals.atRisk,
												barClass: "bg-warning",
											},
											{
												label: "Blocked",
												count: reportsSummary.totals.blocked,
												barClass: "bg-danger",
											},
										].map((row) => {
											const denom =
												reportsSummary.totals.totalProjects || 1;
											const pct = Math.round(
												(row.count / denom) * 100,
											);
											return (
												<div key={row.label}>
													<div className="mb-1.5 flex items-center justify-between">
														<span className="text-sm text-foreground">
															{row.label}
														</span>
														<span className="text-sm font-medium text-foreground">
															{row.count}
														</span>
													</div>
													<div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
														<div
															className={`h-full ${row.barClass} rounded-full transition-all`}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>
											);
										})}

										<div className="border-t border-border pt-4">
											<div className="mb-1.5 flex items-center justify-between">
												<span className="text-sm text-muted">
													Overall Progress
												</span>
												<span className="text-sm font-semibold text-foreground">
													{reportsSummary.overallProgressPct}%
												</span>
											</div>
											<div className="h-2 w-full overflow-hidden rounded-full bg-border">
												<div
													className="h-full rounded-full bg-primary transition-all"
													style={{
														width: `${reportsSummary.overallProgressPct}%`,
													}}
												/>
											</div>
										</div>
									</div>

									<Button
										variant="outline"
										className="mt-5 w-full text-sm"
										onClick={() => navigate("/admin/reports")}
									>
										View Reports
									</Button>
								</>
							)}

							{!reportsLoading && !reportsSummary && (
								<Button
									variant="outline"
									className="w-full text-sm"
									onClick={() => navigate("/admin/reports")}
								>
									View Reports
								</Button>
							)}
						</Card>
					)}
				</div>
			</div>

			{/* Floating action button */}
			<button className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary-hover transition-colors">
				<Zap className="h-5 w-5" />
			</button>
		</div>
	);
}
