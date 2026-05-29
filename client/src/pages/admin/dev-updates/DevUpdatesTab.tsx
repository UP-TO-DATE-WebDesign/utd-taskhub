import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Search,
	Sparkles,
	Table as TableIcon,
	GanttChartSquare,
	Calendar as CalendarIcon,
	AlertTriangle,
	Loader2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	listDevUpdates,
	DEV_UPDATE_TYPES,
	type DevUpdate,
} from "@/services/dev-updates.service";
import DevUpdatesTable from "./DevUpdatesTable";
import GenerateDevUpdatesModal from "./GenerateDevUpdatesModal";

type ViewMode = "table" | "timeline" | "calendar";

const VIEWS: { key: ViewMode; label: string; icon: typeof TableIcon }[] = [
	{ key: "table", label: "Table", icon: TableIcon },
	{ key: "timeline", label: "Timeline", icon: GanttChartSquare },
	{ key: "calendar", label: "Calendar", icon: CalendarIcon },
];

export default function DevUpdatesTab() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [app, setApp] = useState("");
	const [type, setType] = useState("");
	const [view, setView] = useState<ViewMode>("table");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(25);

	const [updates, setUpdates] = useState<DevUpdate[]>([]);
	const [apps, setApps] = useState<string[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 350);
		return () => clearTimeout(t);
	}, [search]);

	// Reset to first page whenever filters or page size change.
	useEffect(() => {
		setPage(1);
	}, [app, type, debouncedSearch, limit]);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await listDevUpdates({
				app: app || undefined,
				type: type || undefined,
				search: debouncedSearch || undefined,
				page,
				limit,
			});
			setUpdates(data.updates);
			setTotal(data.total);
			if (data.apps.length) setApps(data.apps);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load dev updates");
		} finally {
			setLoading(false);
		}
	}, [app, type, debouncedSearch, page, limit]);

	useEffect(() => {
		load();
	}, [load]);

	const totalPages = Math.max(1, Math.ceil(total / limit));

	const content = useMemo(() => {
		if (loading) {
			return (
				<div className="flex items-center justify-center py-16 text-muted">
					<Loader2 className="h-5 w-5 animate-spin" />
				</div>
			);
		}
		if (error) {
			return (
				<div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>{error}</span>
				</div>
			);
		}
		if (updates.length === 0) {
			return (
				<p className="py-16 text-center text-sm text-muted">
					No dev updates found.
				</p>
			);
		}
		if (view === "table") return <DevUpdatesTable updates={updates} />;
		return (
			<p className="py-16 text-center text-sm text-muted">
				{view === "timeline" ? "Timeline" : "Calendar"} view coming soon.
			</p>
		);
	}, [loading, error, updates, view]);

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search updates…"
							className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground"
						/>
					</div>
					<select
						value={app}
						onChange={(e) => setApp(e.target.value)}
						className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
					>
						<option value="">All apps</option>
						{apps.map((a) => (
							<option key={a} value={a}>
								{a}
							</option>
						))}
					</select>
					<select
						value={type}
						onChange={(e) => setType(e.target.value)}
						className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
					>
						<option value="">All types</option>
						{DEV_UPDATE_TYPES.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2">
					{/* View switch */}
					<div className="flex rounded-md border border-border p-0.5">
						{VIEWS.map((v) => {
							const Icon = v.icon;
							return (
								<button
									key={v.key}
									type="button"
									onClick={() => setView(v.key)}
									className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
										view === v.key
											? "bg-primary text-primary-foreground"
											: "text-muted hover:text-foreground"
									}`}
								>
									<Icon className="h-3.5 w-3.5" />
									{v.label}
								</button>
							);
						})}
					</div>

					<Button size="sm" onClick={() => setModalOpen(true)}>
						<Sparkles className="h-4 w-4" />
						Generate Dev Updates
					</Button>
				</div>
			</div>

			{!loading && !error && (
				<p className="text-xs text-muted">{total} updates</p>
			)}

			{content}

			{/* Pagination (table view only) */}
			{!loading && !error && view === "table" && total > 0 && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2 text-xs text-muted">
						<span>Rows per page</span>
						<select
							value={limit}
							onChange={(e) => setLimit(Number(e.target.value))}
							className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
						>
							{[10, 25, 50, 100].map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2 text-xs text-muted">
						<span>
							Page {page} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Prev
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			<GenerateDevUpdatesModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				onGenerated={load}
			/>
		</div>
	);
}
