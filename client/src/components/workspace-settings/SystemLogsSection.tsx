import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Clock3,
	Database,
	FileJson,
	Loader2,
	RefreshCw,
	RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
	listSystemLogs,
	type SystemLog,
	type SystemLogAction,
	type SystemLogTable,
} from "@/services/system-log.service";
import { SectionBlock } from "./SectionBlock";

const PAGE_SIZE = 25;

const TABLE_OPTIONS: { value: "all" | SystemLogTable; label: string }[] = [
	{ value: "all", label: "All tables" },
	{ value: "projects", label: "Projects" },
	{ value: "tasks", label: "Tasks" },
	{ value: "tickets", label: "Tickets" },
	{ value: "boards", label: "Boards" },
	{ value: "board_columns", label: "Board columns" },
	{ value: "comments", label: "Comments" },
	{ value: "project_members", label: "Project members" },
	{ value: "profiles", label: "Profiles" },
	{ value: "sprints", label: "Sprints" },
	{ value: "workspace_settings", label: "Workspace settings" },
];

const ACTION_OPTIONS: { value: "all" | SystemLogAction; label: string }[] = [
	{ value: "all", label: "All actions" },
	{ value: "INSERT", label: "Created" },
	{ value: "UPDATE", label: "Updated" },
	{ value: "DELETE", label: "Deleted" },
];

interface Filters {
	table: "all" | SystemLogTable;
	action: "all" | SystemLogAction;
	fromDate: string;
	toDate: string;
}

function formatTableName(table: string) {
	return table
		.split("_")
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(" ");
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

function toDayBoundary(value: string, boundary: "start" | "end") {
	if (!value) return undefined;

	const date = new Date(`${value}T00:00:00`);
	if (boundary === "end") {
		date.setHours(23, 59, 59, 999);
	}

	return date.toISOString();
}

function formatActor(log: SystemLog) {
	if (log.changer?.full_name) return log.changer.full_name;
	if (log.changer?.email) return log.changer.email;
	if (log.changed_by) return log.changed_by.slice(0, 8);
	return "System";
}

function toJson(value: Record<string, unknown> | null) {
	return value ? JSON.stringify(value, null, 2) : "null";
}

function getChangedFields(log: SystemLog, limit?: number) {
	let fields: string[];

	if (log.action === "INSERT") {
		fields = Object.keys(log.new_data ?? {});
	} else if (log.action === "DELETE") {
		fields = Object.keys(log.old_data ?? {});
	} else {
		const oldData = log.old_data ?? {};
		const newData = log.new_data ?? {};
		fields = Object.keys(newData).filter(
			(key) =>
				JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]),
		);
	}

	return typeof limit === "number" ? fields.slice(0, limit) : fields;
}

function formatFieldName(field: string) {
	return field
		.split("_")
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(" ");
}

function formatValue(value: unknown) {
	if (value === null || value === undefined || value === "") return "Empty";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	return JSON.stringify(value);
}

function ActionBadge({ action }: { action: SystemLogAction }) {
	const className =
		action === "INSERT"
			? "bg-secondary-subtle text-secondary border border-secondary/20"
			: action === "UPDATE"
				? "bg-primary-subtle text-primary border border-primary/20"
				: "bg-danger-subtle text-danger border border-danger/20";

	return (
		<Badge variant="default" className={cn("font-medium", className)}>
			{action === "INSERT"
				? "Created"
				: action === "UPDATE"
					? "Updated"
					: "Deleted"}
		</Badge>
	);
}

function LogDataDialog({
	log,
	onClose,
}: {
	log: SystemLog | null;
	onClose: () => void;
}) {
	if (!log) return null;

	const fields = getChangedFields(log);
	const title =
		log.action === "INSERT"
			? "Record created"
			: log.action === "UPDATE"
				? "Record updated"
				: "Record deleted";
	const helperText =
		log.action === "INSERT"
			? "These values were added to the database."
			: log.action === "UPDATE"
				? "These fields changed in the database."
				: "These values were removed from the database.";

	return (
		<Dialog
			open={log !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-xl p-5">
				<DialogHeader className="mb-3 pb-0">
					<div className="flex items-center gap-2 pr-7">
						<ActionBadge action={log.action} />
						<DialogTitle className="text-sm text-foreground">
							{title}
						</DialogTitle>
					</div>
					<DialogDescription>
						{formatTableName(log.table_name)} by {formatActor(log)}{" "}
						on {formatDateTime(log.changed_at)}.
					</DialogDescription>
				</DialogHeader>

				<div className="mb-3 rounded-lg border border-border bg-muted-subtle px-3 py-2">
					<div className="text-xs font-medium text-muted-foreground">
						{helperText}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
						<span>Record ID</span>
						<code className="rounded bg-surface px-1.5 py-0.5">
							{log.record_id}
						</code>
					</div>
				</div>

				<div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
					{fields.length === 0 && (
						<div className="rounded-lg border border-border px-3 py-4 text-sm text-muted">
							No field changes were detected for this log entry.
						</div>
					)}

					{fields.map((field) => {
						const oldValue = log.old_data?.[field];
						const newValue = log.new_data?.[field];

						return (
							<div
								key={field}
								className="rounded-lg border border-border p-3"
							>
								<div className="mb-2 text-sm font-medium text-foreground">
									{formatFieldName(field)}
								</div>

								{log.action === "UPDATE" ? (
									<div className="grid gap-2 sm:grid-cols-2">
										<div>
											<div className="mb-1 text-[11px] font-medium uppercase text-muted">
												Before
											</div>
											<div className="break-words rounded-md bg-danger-subtle px-2 py-1.5 text-xs text-danger">
												{formatValue(oldValue)}
											</div>
										</div>
										<div>
											<div className="mb-1 text-[11px] font-medium uppercase text-muted">
												After
											</div>
											<div className="break-words rounded-md bg-secondary-subtle px-2 py-1.5 text-xs text-secondary">
												{formatValue(newValue)}
											</div>
										</div>
									</div>
								) : (
									<div className="break-words rounded-md bg-muted-subtle px-2 py-1.5 text-xs text-muted-foreground">
										{formatValue(
											log.action === "INSERT"
												? newValue
												: oldValue,
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>

				<details className="mt-3 rounded-lg border border-border px-3 py-2">
					<summary className="text-xs font-medium text-muted-foreground">
						Raw database data
					</summary>
					<div className="mt-2 grid gap-1 sm:grid-cols-1">
						<div>
							<div className="mb-1 text-[11px] font-medium uppercase text-muted">
								Old
							</div>
							<pre className="max-h-40 overflow-auto rounded-md bg-muted-subtle p-2 text-[11px] leading-relaxed text-muted-foreground">
								{toJson(log.old_data)}
							</pre>
						</div>
						<div>
							<div className="mb-1 text-[11px] font-medium uppercase text-muted">
								New
							</div>
							<pre className="max-h-40 overflow-auto rounded-md bg-muted-subtle p-2 text-[11px] leading-relaxed text-muted-foreground">
								{toJson(log.new_data)}
							</pre>
						</div>
					</div>
				</details>
			</DialogContent>
		</Dialog>
	);
}

export function SystemLogsSection() {
	const [logs, setLogs] = useState<SystemLog[]>([]);
	const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
	const [count, setCount] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFilters] = useState<Filters>({
		table: "all",
		action: "all",
		fromDate: "",
		toDate: "",
	});

	const hasActiveFilters = useMemo(
		() =>
			filters.table !== "all" ||
			filters.action !== "all" ||
			Boolean(filters.fromDate) ||
			Boolean(filters.toDate),
		[filters],
	);

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await listSystemLogs({
				table: filters.table === "all" ? undefined : filters.table,
				action: filters.action === "all" ? undefined : filters.action,
				fromDate: toDayBoundary(filters.fromDate, "start"),
				toDate: toDayBoundary(filters.toDate, "end"),
				page,
				limit: PAGE_SIZE,
			});

			setLogs(res.data);
			setCount(res.count);
			setTotalPages(Math.max(res.totalPages, 1));
		} catch (err: unknown) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to load system logs.";
			setError(message);
			setLogs([]);
			setCount(0);
			setTotalPages(1);
		} finally {
			setLoading(false);
		}
	}, [filters, page]);

	useEffect(() => {
		void Promise.resolve().then(fetchLogs);
	}, [fetchLogs]);

	function updateFilter(next: Partial<Filters>) {
		setPage(1);
		setFilters((current) => ({ ...current, ...next }));
	}

	function clearFilters() {
		setPage(1);
		setFilters({
			table: "all",
			action: "all",
			fromDate: "",
			toDate: "",
		});
	}

	return (
		<SectionBlock
			title="System Logs"
			description="Review audit records captured from the system logs database."
		>
			<div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_auto]">
				<div>
					<label className="mb-1.5 block text-sm font-medium text-muted-foreground">
						Table
					</label>
					<SearchableSelect
						value={filters.table}
						onValueChange={(value) =>
							updateFilter({
								table: (value || "all") as Filters["table"],
							})
						}
						options={TABLE_OPTIONS}
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-muted-foreground">
						Action
					</label>
					<SearchableSelect
						value={filters.action}
						onValueChange={(value) =>
							updateFilter({
								action: (value || "all") as Filters["action"],
							})
						}
						options={ACTION_OPTIONS}
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-muted-foreground">
						From
					</label>
					<Input
						type="date"
						value={filters.fromDate}
						onChange={(event) =>
							updateFilter({ fromDate: event.target.value })
						}
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-muted-foreground">
						To
					</label>
					<Input
						type="date"
						value={filters.toDate}
						onChange={(event) =>
							updateFilter({ toDate: event.target.value })
						}
					/>
				</div>

				<div className="flex items-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={fetchLogs}
						disabled={loading}
						title="Refresh logs"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="h-4 w-4" />
						)}
					</Button>
					<Button
						type="button"
						variant="muted"
						size="icon"
						onClick={clearFilters}
						disabled={!hasActiveFilters || loading}
						title="Clear filters"
					>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
				<div className="flex items-center gap-2">
					<Database className="h-3.5 w-3.5" />
					<span>
						{count.toLocaleString()} log{count === 1 ? "" : "s"}{" "}
						found
					</span>
				</div>
				<div className="flex items-center gap-2">
					<Clock3 className="h-3.5 w-3.5" />
					<span>Newest activity first</span>
				</div>
			</div>

			<div className="overflow-hidden rounded-lg border border-border">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[920px] text-sm">
						<thead>
							<tr className="border-b border-border bg-muted-subtle">
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Event
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Table
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Record
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Changed fields
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Actor
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-muted">
									Time
								</th>
							</tr>
						</thead>
						<tbody>
							{loading && logs.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-4 py-10 text-center"
									>
										<div className="flex items-center justify-center gap-2 text-muted">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span>Loading system logs...</span>
										</div>
									</td>
								</tr>
							)}

							{error && (
								<tr>
									<td
										colSpan={6}
										className="px-4 py-10 text-center"
									>
										<div className="inline-flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-subtle px-3 py-2 text-sm text-danger">
											<AlertCircle className="h-4 w-4" />
											{error}
										</div>
									</td>
								</tr>
							)}

							{!loading && !error && logs.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="px-4 py-10 text-center"
									>
										<div className="flex flex-col items-center gap-2 text-muted">
											<FileJson className="h-5 w-5" />
											<span>No system logs found.</span>
										</div>
									</td>
								</tr>
							)}

							{logs.map((log) => {
								const fields = getChangedFields(log, 5);

								return (
									<tr
										key={log.id}
										className="border-b border-border last:border-0 align-top transition-colors hover:bg-muted-subtle/60"
									>
										<td className="px-4 py-3">
											<ActionBadge action={log.action} />
										</td>
										<td className="px-4 py-3">
											<div className="font-medium text-foreground">
												{formatTableName(
													log.table_name,
												)}
											</div>
											<div className="text-xs text-muted">
												{log.table_name}
											</div>
										</td>
										<td className="px-4 py-3">
											<code className="rounded bg-muted-subtle px-1.5 py-0.5 text-xs text-muted-foreground">
												{log.record_id.slice(0, 8)}
											</code>
										</td>
										<td className="px-4 py-3">
											<div className="flex max-w-[260px] flex-wrap gap-1.5">
												{fields.length > 0 ? (
													fields.map((field) => (
														<span
															key={field}
															className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground"
														>
															{field}
														</span>
													))
												) : (
													<span className="text-xs text-muted">
														No field diff
													</span>
												)}
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="mt-2 h-7 px-2 text-xs"
												onClick={() =>
													setSelectedLog(log)
												}
											>
												<FileJson className="h-3.5 w-3.5" />
												View data
											</Button>
										</td>
										<td className="px-4 py-3">
											<div className="max-w-[180px] truncate font-medium text-foreground">
												{formatActor(log)}
											</div>
											{log.changer?.email &&
												log.changer.full_name && (
													<div className="max-w-[180px] truncate text-xs text-muted">
														{log.changer.email}
													</div>
												)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
											{formatDateTime(log.changed_at)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
				<p className="text-xs text-muted">
					Page {page} of {totalPages}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setPage((current) => Math.max(current - 1, 1))
						}
						disabled={page <= 1 || loading}
					>
						<ChevronLeft className="h-3.5 w-3.5" />
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setPage((current) =>
								Math.min(current + 1, totalPages),
							)
						}
						disabled={page >= totalPages || loading}
					>
						Next
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			<LogDataDialog
				log={selectedLog}
				onClose={() => setSelectedLog(null)}
			/>
		</SectionBlock>
	);
}
