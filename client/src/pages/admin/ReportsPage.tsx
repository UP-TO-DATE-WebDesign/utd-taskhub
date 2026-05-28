import { useEffect, useMemo, useState } from "react";
import {
	CheckCircle2,
	AlertTriangle,
	Ban,
	Activity,
	Download,
	TrendingUp,
	Layers,
	Gauge,
	Clock,
	BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	AreaChart,
	Area,
	BarChart,
	Bar,
} from "recharts";
import SkeletonLoader from "@/components/ui/skeleton-loader";
import { useAuth } from "@/context/AuthContext";
import {
	getAdminReports,
	type AdminReportPayload,
} from "@/services/admin-report.service";
import DevUpdatesReportsCard from "./DevUpdatesReportsCard";

/* --------------------------------- CSV --------------------------------- */

function toCSV(rows: Record<string, unknown>[]): string {
	if (!rows || rows.length === 0) return "";
	const headers = Object.keys(rows[0]);
	const escape = (val: unknown): string => {
		if (val === null || val === undefined) return "";
		const s = String(val);
		if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	};
	const lines = [headers.join(",")];
	for (const r of rows) {
		lines.push(headers.map((h) => escape(r[h])).join(","));
	}
	return lines.join("\n");
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
	const csv = toCSV(rows);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/* ------------------------------ Role gate ------------------------------ */

function useCurrentUserRole(): string {
	try {
		const raw =
			(typeof window !== "undefined" && window.localStorage.getItem("user")) ||
			"";
		if (raw) {
			const parsed = JSON.parse(raw);
			return parsed?.role || parsed?.user?.role || "admin";
		}
	} catch {
		// ignore
	}
	return "admin";
}

function Unauthorized() {
	return (
		<div className="mx-auto flex max-w-[1280px] flex-col items-center justify-center px-6 py-24 text-center">
			<Ban className="mb-3 h-10 w-10 text-danger" />
			<h2 className="text-2xl font-semibold text-foreground">Unauthorized</h2>
			<p className="mt-2 max-w-md text-sm text-muted">
				You do not have permission to view the Admin Reports page.
			</p>
		</div>
	);
}

/* --------------------------- Status/Priority --------------------------- */

const STATUS_VARIANT: Record<
	string,
	"done" | "high" | "urgent" | "default"
> = {
	"On Track": "done",
	"At Risk": "high",
	Blocked: "urgent",
};

const PRIORITY_VARIANT: Record<
	string,
	"urgent" | "high" | "medium" | "low" | "default"
> = {
	Critical: "urgent",
	High: "high",
	Medium: "medium",
	Low: "low",
};

/* ------------------------------ Chart theme ----------------------------- */

const CHART = {
	grid: "var(--color-border, #e2e8f0)",
	tickStyle: { fontSize: 11, fill: "var(--color-muted, #64748b)" },
	primary: "#2563eb",
	secondary: "#14b8a6",
	accent: "#7c3aed",
	danger: "#dc2626",
	warning: "#f59e0b",
	muted: "#94a3b8",
};

const tooltipStyle = {
	contentStyle: {
		borderRadius: 8,
		border: "1px solid var(--color-border, #e2e8f0)",
		fontSize: 12,
	},
};

/* -------------------------------- Page --------------------------------- */

export default function ReportsPage() {
	const role = useCurrentUserRole();
	const { user } = useAuth();
	const [data, setData] = useState<AdminReportPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				setLoading(true);
				setError(null);
				const payload = await getAdminReports();
				if (mounted) setData(payload);
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load reports",
					);
				}
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const exportAll = useMemo(
		() => () => {
			if (!data) return;
			const flat: Record<string, unknown>[] = [];
			flat.push({ section: "Generated At", value: data.generatedAt });
			flat.push({ section: "" });
			flat.push({ section: "Project Status - Totals" });
			Object.entries(data.projectStatusSummary.totals).forEach(([k, v]) =>
				flat.push({ key: k, value: v }),
			);
			flat.push({ section: "" });
			flat.push({ section: "Projects" });
			data.projectStatusSummary.projects.forEach((p) =>
				flat.push(p as unknown as Record<string, unknown>),
			);
			downloadCSV("admin-reports-full", flat);
		},
		[data],
	);

	if (role !== "admin") return <Unauthorized />;

	const firstName = user?.full_name?.split(" ")[0] ?? "Admin";

	/* ------------------------------ Loading ------------------------------ */
	if (loading) {
		return (
			<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
				<div className="mb-8 flex items-start justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-foreground">
							Admin Reports
						</h1>
						<p className="mt-1 text-sm text-muted">
							Loading cross-project analytics&hellip;
						</p>
					</div>
					<SkeletonLoader className="h-9 w-28" />
				</div>

				<div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					{Array.from({ length: 5 }).map((_, i) => (
						<Card key={i} className="p-4">
							<SkeletonLoader className="mb-3 h-4 w-20" />
							<div className="flex items-center justify-between">
								<SkeletonLoader className="h-8 w-12" />
								<SkeletonLoader className="h-6 w-6 rounded-full" />
							</div>
						</Card>
					))}
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i} className="p-5">
							<SkeletonLoader className="mb-4 h-5 w-40" />
							<SkeletonLoader className="h-64 w-full" />
						</Card>
					))}
				</div>
			</div>
		);
	}

	/* ------------------------------- Error ------------------------------- */
	if (error) {
		return (
			<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
				<Card className="border-danger/20 bg-danger-subtle p-5">
					<div className="flex items-start gap-3 text-danger">
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<div className="flex-1">
							<p className="font-medium">Failed to load reports</p>
							<p className="mt-1 text-sm">{error}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.location.reload()}
						>
							Retry
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	if (!data) return null;

	const { projectStatusSummary: pss } = data;

	const statCards = [
		{
			label: "On Track",
			value: pss.totals.onTrack,
			icon: CheckCircle2,
			iconClass: "text-secondary",
		},
		{
			label: "At Risk",
			value: pss.totals.atRisk,
			icon: AlertTriangle,
			iconClass: "text-warning",
		},
		{
			label: "Blocked",
			value: pss.totals.blocked,
			icon: Ban,
			iconClass: "text-danger",
			valueClass: "text-danger",
		},
		{
			label: "Completed",
			value: pss.totals.completed,
			icon: Activity,
			iconClass: "text-primary",
		},
		{
			label: "Progress",
			value: `${pss.overallProgressPct}%`,
			icon: Gauge,
			iconClass: "text-accent",
		},
	];

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Page header */}
			<div className="mb-8 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						Admin Reports
					</h1>
					<p className="mt-1 text-sm text-muted">
						Hello {firstName}, here is the cross-project analytics snapshot.
					</p>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="gap-2">
							<Download className="h-4 w-4" />
							Export CSV
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel>Export dataset</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={exportAll}>
							All reports (summary)
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"projects",
									pss.projects as unknown as Record<string, unknown>[],
								)
							}
						>
							Project status
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"task-completion",
									data.taskCompletion as unknown as Record<string, unknown>[],
								)
							}
						>
							Task completion
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"burn-chart",
									data.burnChart.data as unknown as Record<string, unknown>[],
								)
							}
						>
							Burn-down / Burn-up
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"cumulative-flow",
									data.cumulativeFlow as unknown as Record<string, unknown>[],
								)
							}
						>
							Cumulative flow
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"overdue-tasks",
									data.overdueTasks as unknown as Record<string, unknown>[],
								)
							}
						>
							Overdue tasks
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"velocity",
									data.velocity as unknown as Record<string, unknown>[],
								)
							}
						>
							Velocity
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								downloadCSV(
									"time-tracking",
									data.timeTracking as unknown as Record<string, unknown>[],
								)
							}
						>
							Time tracking
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Stat cards */}
			<div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{statCards.map((s) => (
					<Card key={s.label} className="p-4">
						<p className="mb-3 text-xs text-muted">{s.label}</p>
						<div className="flex items-center justify-between">
							<span
								className={`text-3xl font-bold tabular-nums ${s.valueClass ?? "text-foreground"}`}
							>
								{s.value}
							</span>
							<s.icon className={`h-6 w-6 ${s.iconClass}`} />
						</div>
					</Card>
				))}
			</div>

			{/* Projects breakdown */}
			<Card className="mb-6 overflow-hidden p-0">
				<div className="flex items-center justify-between border-b border-border px-5 py-4">
					<div>
						<h2 className="text-base font-semibold text-foreground">
							Projects breakdown
						</h2>
						<p className="mt-0.5 text-xs text-muted">
							Latest snapshot of every active project.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() =>
							downloadCSV(
								"projects",
								pss.projects as unknown as Record<string, unknown>[],
							)
						}
					>
						<Download className="h-3.5 w-3.5" />
						CSV
					</Button>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border">
								<th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Project
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Status
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Owner
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Deadline
								</th>
								<th className="w-[220px] px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Progress
								</th>
							</tr>
						</thead>
						<tbody>
							{pss.projects.map((p) => (
								<tr
									key={p.id}
									className="border-b border-border transition-colors last:border-0 hover:bg-muted-subtle"
								>
									<td className="px-5 py-4 text-sm font-medium text-foreground">
										{p.name}
									</td>
									<td className="px-4 py-4">
										<Badge variant={STATUS_VARIANT[p.status] ?? "default"}>
											{p.status}
										</Badge>
									</td>
									<td className="px-4 py-4 text-sm text-muted-foreground">
										{p.owner}
									</td>
									<td className="px-4 py-4 text-sm text-muted-foreground">
										{p.deadline}
									</td>
									<td className="px-4 py-4">
										<div className="flex items-center gap-2">
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
												<div
													className="h-full rounded-full bg-primary transition-all"
													style={{ width: `${p.progress}%` }}
												/>
											</div>
											<span className="w-10 text-right text-xs font-medium text-foreground">
												{p.progress}%
											</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Charts row 1: Task Completion + Burn */}
			<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="p-5">
					<div className="mb-4 flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4 text-primary" />
								<h2 className="text-base font-semibold text-foreground">
									Task Completion
								</h2>
							</div>
							<p className="mt-1 text-xs text-muted">
								Planned vs actual completed tasks.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								downloadCSV(
									"task-completion",
									data.taskCompletion as unknown as Record<string, unknown>[],
								)
							}
						>
							CSV
						</Button>
					</div>
					<div style={{ height: 280 }}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.taskCompletion}>
								<CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
								<XAxis dataKey="date" tick={CHART.tickStyle} />
								<YAxis tick={CHART.tickStyle} />
								<Tooltip {...tooltipStyle} />
								<Legend wrapperStyle={{ fontSize: 12 }} />
								<Line
									type="monotone"
									dataKey="planned"
									stroke={CHART.primary}
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Planned"
								/>
								<Line
									type="monotone"
									dataKey="actual"
									stroke={CHART.secondary}
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Actual"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card className="p-5">
					<div className="mb-4 flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<Activity className="h-4 w-4 text-accent" />
								<h2 className="text-base font-semibold text-foreground">
									Burn-down / Burn-up
								</h2>
							</div>
							<p className="mt-1 text-xs text-muted">
								{data.burnChart.sprintName}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								downloadCSV(
									"burn-chart",
									data.burnChart.data as unknown as Record<string, unknown>[],
								)
							}
						>
							CSV
						</Button>
					</div>
					<div style={{ height: 280 }}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.burnChart.data}>
								<CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
								<XAxis dataKey="day" tick={CHART.tickStyle} />
								<YAxis tick={CHART.tickStyle} />
								<Tooltip {...tooltipStyle} />
								<Legend wrapperStyle={{ fontSize: 12 }} />
								<Line
									type="monotone"
									dataKey="idealRemaining"
									stroke={CHART.muted}
									strokeDasharray="4 4"
									dot={false}
									name="Ideal"
								/>
								<Line
									type="monotone"
									dataKey="remaining"
									stroke={CHART.danger}
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Remaining"
								/>
								<Line
									type="monotone"
									dataKey="completed"
									stroke={CHART.secondary}
									strokeWidth={2}
									dot={{ r: 3 }}
									name="Completed"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>

			{/* Cumulative Flow */}
			<Card className="mb-6 p-5">
				<div className="mb-4 flex items-start justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Layers className="h-4 w-4 text-primary" />
							<h2 className="text-base font-semibold text-foreground">
								Cumulative Flow Diagram
							</h2>
						</div>
						<p className="mt-1 text-xs text-muted">
							Tasks accumulating across workflow stages.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadCSV(
								"cumulative-flow",
								data.cumulativeFlow as unknown as Record<string, unknown>[],
							)
						}
					>
						CSV
					</Button>
				</div>
				<div style={{ height: 320 }}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data.cumulativeFlow}>
							<CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
							<XAxis dataKey="date" tick={CHART.tickStyle} />
							<YAxis tick={CHART.tickStyle} />
							<Tooltip {...tooltipStyle} />
							<Legend wrapperStyle={{ fontSize: 12 }} />
							<Area
								type="monotone"
								dataKey="todo"
								stackId="1"
								stroke={CHART.muted}
								fill={CHART.muted}
								fillOpacity={0.35}
								name="Todo"
							/>
							<Area
								type="monotone"
								dataKey="inProgress"
								stackId="1"
								stroke={CHART.primary}
								fill={CHART.primary}
								fillOpacity={0.35}
								name="In Progress"
							/>
							<Area
								type="monotone"
								dataKey="review"
								stackId="1"
								stroke={CHART.warning}
								fill={CHART.warning}
								fillOpacity={0.35}
								name="Review"
							/>
							<Area
								type="monotone"
								dataKey="done"
								stackId="1"
								stroke={CHART.secondary}
								fill={CHART.secondary}
								fillOpacity={0.45}
								name="Done"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</Card>

			{/* Overdue Tasks */}
			<Card className="mb-6 overflow-hidden p-0">
				<div className="flex items-center justify-between border-b border-border px-5 py-4">
					<div>
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-danger" />
							<h2 className="text-base font-semibold text-foreground">
								Overdue Tasks
							</h2>
						</div>
						<p className="mt-0.5 text-xs text-muted">
							Tasks past their deadline, sorted by lateness.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() =>
							downloadCSV(
								"overdue-tasks",
								data.overdueTasks as unknown as Record<string, unknown>[],
							)
						}
					>
						<Download className="h-3.5 w-3.5" />
						CSV
					</Button>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border">
								<th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Task
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Project
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Assignee
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Deadline
								</th>
								<th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-muted">
									Priority
								</th>
								<th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
									Days Overdue
								</th>
							</tr>
						</thead>
						<tbody>
							{data.overdueTasks.map((t) => (
								<tr
									key={t.id}
									className="border-b border-border transition-colors last:border-0 hover:bg-muted-subtle"
								>
									<td className="px-5 py-4">
										<div className="flex flex-col">
											<span className="text-sm font-medium text-foreground">
												{t.title}
											</span>
											<span className="text-xs text-muted">{t.id}</span>
										</div>
									</td>
									<td className="px-4 py-4 text-sm text-muted-foreground">
										{t.project}
									</td>
									<td className="px-4 py-4 text-sm text-muted-foreground">
										{t.assignee}
									</td>
									<td className="px-4 py-4 text-sm text-muted-foreground">
										{t.deadline}
									</td>
									<td className="px-4 py-4">
										<Badge variant={PRIORITY_VARIANT[t.priority] ?? "default"}>
											{t.priority}
										</Badge>
									</td>
									<td className="px-4 py-4 text-right">
										<span className="inline-flex items-center gap-1 text-sm font-medium text-danger">
											<Clock className="h-3.5 w-3.5" />
											{t.daysOverdue}d
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Charts row 2: Velocity + Time Tracking */}
			<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="p-5">
					<div className="mb-4 flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4 text-primary" />
								<h2 className="text-base font-semibold text-foreground">
									Velocity
								</h2>
							</div>
							<p className="mt-1 text-xs text-muted">
								Story points committed vs completed.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								downloadCSV(
									"velocity",
									data.velocity as unknown as Record<string, unknown>[],
								)
							}
						>
							CSV
						</Button>
					</div>
					<div style={{ height: 280 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.velocity}>
								<CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
								<XAxis dataKey="sprint" tick={CHART.tickStyle} />
								<YAxis tick={CHART.tickStyle} />
								<Tooltip {...tooltipStyle} />
								<Legend wrapperStyle={{ fontSize: 12 }} />
								<Bar
									dataKey="committed"
									fill={CHART.muted}
									name="Committed"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="completed"
									fill={CHART.primary}
									name="Completed"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card className="p-5">
					<div className="mb-4 flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<Gauge className="h-4 w-4 text-accent" />
								<h2 className="text-base font-semibold text-foreground">
									Time Tracking vs Estimates
								</h2>
							</div>
							<p className="mt-1 text-xs text-muted">
								Budgeted hours vs actual logged hours.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								downloadCSV(
									"time-tracking",
									data.timeTracking as unknown as Record<string, unknown>[],
								)
							}
						>
							CSV
						</Button>
					</div>
					<div style={{ height: 280 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.timeTracking}>
								<CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
								<XAxis
									dataKey="project"
									tick={CHART.tickStyle}
									interval={0}
									angle={-15}
									textAnchor="end"
									height={60}
								/>
								<YAxis tick={CHART.tickStyle} />
								<Tooltip {...tooltipStyle} />
								<Legend wrapperStyle={{ fontSize: 12 }} />
								<Bar
									dataKey="estimatedHours"
									fill={CHART.muted}
									name="Estimated"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="actualHours"
									fill={CHART.danger}
									name="Actual"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>

			<DevUpdatesReportsCard />

			<p className="text-right text-xs text-muted">
				Generated at {new Date(data.generatedAt).toLocaleString()}
			</p>
		</div>
	);
}
