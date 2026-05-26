import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Trash2,
	RotateCcw,
	Search,
	AlertTriangle,
	Ban,
	Inbox,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import SkeletonLoader from "@/components/ui/skeleton-loader";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
	listTrash,
	restoreTrashItem,
	purgeTrashItem,
	type TrashItem,
	type TrashRecordType,
} from "@/services/trash.service";
import { SectionBlock } from "./SectionBlock";

const RECORD_TYPE_LABEL: Record<TrashRecordType, string> = {
	projects: "Project",
	tasks: "Task",
	tickets: "Ticket",
	sprints: "Sprint",
	profiles: "User",
};

const FILTER_OPTIONS: { value: "all" | TrashRecordType; label: string }[] = [
	{ value: "all", label: "All types" },
	{ value: "projects", label: "Projects" },
	{ value: "tasks", label: "Tasks" },
	{ value: "tickets", label: "Tickets" },
	{ value: "sprints", label: "Sprints" },
	{ value: "profiles", label: "Users" },
];

function formatRelative(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const sec = Math.max(1, Math.floor(diffMs / 1000));
	if (sec < 60) return `${sec}s ago`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d ago`;
	return new Date(iso).toLocaleDateString();
}

function initialsOf(name: string | null | undefined, email?: string): string {
	const src = name || email || "?";
	return src
		.split(" ")
		.map((p) => p[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function TrashSection() {
	const { can } = usePermission();
	const [items, setItems] = useState<TrashItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | TrashRecordType>("all");
	const [search, setSearch] = useState("");
	const [actioningId, setActioningId] = useState<string | null>(null);
	const [restoreTarget, setRestoreTarget] = useState<TrashItem | null>(null);
	const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);

	const canManage = can("Manage trash");

	const fetchItems = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await listTrash({
				record_type: filter === "all" ? undefined : filter,
				limit: 200,
			});
			setItems(res.data);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load trash");
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => {
		if (canManage) fetchItems();
	}, [canManage, fetchItems]);

	const visibleItems = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return items;
		return items.filter((it) =>
			(it.name ?? "").toLowerCase().includes(term),
		);
	}, [items, search]);

	if (!canManage) {
		return (
			<SectionBlock
				title="Trash"
				description="Restore or permanently delete items removed across the workspace."
			>
				<div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger-subtle px-3 py-2 text-sm text-danger">
					<Ban className="h-4 w-4 shrink-0" />
					You do not have permission to view Trash.
				</div>
			</SectionBlock>
		);
	}

	async function handleRestore(item: TrashItem) {
		try {
			setActioningId(item.id);
			await restoreTrashItem(item.id);
			toast.success("Record restored.", { description: item.name ?? undefined });
			setRestoreTarget(null);
			await fetchItems();
		} catch (e) {
			toast.error("Restore failed", {
				description: e instanceof Error ? e.message : undefined,
			});
		} finally {
			setActioningId(null);
		}
	}

	async function handlePurge(item: TrashItem) {
		try {
			setActioningId(item.id);
			await purgeTrashItem(item.id);
			toast.success("Permanently deleted.", {
				description: item.name ?? undefined,
			});
			setPurgeTarget(null);
			await fetchItems();
		} catch (e) {
			toast.error("Delete failed", {
				description: e instanceof Error ? e.message : undefined,
			});
		} finally {
			setActioningId(null);
		}
	}

	return (
		<SectionBlock
			title="Trash"
			description="Restore or permanently delete items removed across the workspace."
		>
			<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap items-center gap-1.5">
					{FILTER_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => setFilter(opt.value)}
							className={
								"rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
								(filter === opt.value
									? "bg-primary text-primary-foreground"
									: "bg-muted-subtle text-muted-foreground hover:bg-muted hover:text-foreground")
							}
						>
							{opt.label}
						</button>
					))}
				</div>
				<div className="relative w-full md:w-64">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by name..."
						className="pl-8"
					/>
				</div>
			</div>

			{error ? (
				<div className="rounded-md border border-danger/20 bg-danger-subtle p-4">
					<div className="flex items-start gap-3 text-danger">
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<div className="flex-1">
							<p className="font-medium">Failed to load trash</p>
							<p className="mt-1 text-sm">{error}</p>
						</div>
						<Button variant="outline" size="sm" onClick={fetchItems}>
							Retry
						</Button>
					</div>
				</div>
			) : loading ? (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<SkeletonLoader key={i} className="h-12 w-full" />
					))}
				</div>
			) : visibleItems.length === 0 ? (
				<div className="flex flex-col items-center rounded-md border border-border p-10 text-center">
					<Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
					<p className="text-base font-medium text-foreground">
						Trash is empty
					</p>
					<p className="mt-1 text-sm text-muted">
						Deleted records will appear here.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-md border border-border">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-muted-subtle text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-4 py-3 text-left font-medium">Type</th>
									<th className="px-4 py-3 text-left font-medium">Name</th>
									<th className="px-4 py-3 text-left font-medium">Deleted by</th>
									<th className="px-4 py-3 text-left font-medium">Deleted</th>
									<th className="px-4 py-3 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{visibleItems.map((it) => {
									const isProfile = it.record_type === "profiles";
									const busy = actioningId === it.id;
									return (
										<tr
											key={it.id}
											className="border-t border-border hover:bg-muted-subtle"
										>
											<td className="px-4 py-3">
												<Badge variant="default">
													{RECORD_TYPE_LABEL[it.record_type]}
												</Badge>
											</td>
											<td className="px-4 py-3 text-foreground">
												<span className="line-clamp-1">
													{it.name ?? <em className="text-muted">(no name)</em>}
												</span>
											</td>
											<td className="px-4 py-3">
												{it.deleter ? (
													<div className="flex items-center gap-2">
														<Avatar className="h-6 w-6">
															{it.deleter.avatar_url && (
																<AvatarImage
																	src={it.deleter.avatar_url}
																	alt={it.deleter.full_name ?? it.deleter.email}
																/>
															)}
															<AvatarFallback className="text-[9px]">
																{initialsOf(
																	it.deleter.full_name,
																	it.deleter.email,
																)}
															</AvatarFallback>
														</Avatar>
														<span className="text-foreground">
															{it.deleter.full_name ?? it.deleter.email}
														</span>
													</div>
												) : (
													<span className="text-muted">Unknown</span>
												)}
											</td>
											<td
												className="px-4 py-3 text-muted"
												title={new Date(it.deleted_at).toLocaleString()}
											>
												{formatRelative(it.deleted_at)}
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center justify-end gap-2">
													{!isProfile && (
														<Button
															size="sm"
															variant="outline"
															disabled={busy}
															onClick={() => setRestoreTarget(it)}
															className="gap-1.5"
														>
															{busy ? (
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															) : (
																<RotateCcw className="h-3.5 w-3.5" />
															)}
															Restore
														</Button>
													)}
													<Button
														size="sm"
														variant="outline"
														disabled={busy}
														onClick={() => setPurgeTarget(it)}
														className="gap-1.5 text-danger hover:bg-danger/10"
													>
														<Trash2 className="h-3.5 w-3.5" />
														Delete forever
													</Button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<Dialog
				open={!!restoreTarget}
				onOpenChange={(open) => !open && setRestoreTarget(null)}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Restore record?</DialogTitle>
						<DialogDescription>
							{restoreTarget?.name ?? "This record"} will be moved back out of
							trash and become active again.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRestoreTarget(null)}
							disabled={!!actioningId}
						>
							Cancel
						</Button>
						<Button
							onClick={() => restoreTarget && handleRestore(restoreTarget)}
							disabled={!!actioningId}
						>
							{actioningId ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Restore
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!purgeTarget}
				onOpenChange={(open) => !open && setPurgeTarget(null)}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-danger">
							Permanently delete?
						</DialogTitle>
						<DialogDescription>
							This will permanently remove{" "}
							<span className="font-medium text-foreground">
								{purgeTarget?.name ?? "this record"}
							</span>
							. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setPurgeTarget(null)}
							disabled={!!actioningId}
						>
							Cancel
						</Button>
						<Button
							onClick={() => purgeTarget && handlePurge(purgeTarget)}
							disabled={!!actioningId}
							className="bg-danger text-white hover:bg-danger/90"
						>
							{actioningId ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Delete forever
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SectionBlock>
	);
}
