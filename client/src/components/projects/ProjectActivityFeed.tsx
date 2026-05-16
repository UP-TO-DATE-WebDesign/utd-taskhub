import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
	listProjectActivity,
	type ActivityEntry,
	type ActivityEntityType,
} from "@/services/activity.service";

const PAGE_SIZE = 50;

type FilterValue = "all" | ActivityEntityType;

const FILTERS: { value: FilterValue; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "task", label: "Tasks" },
	{ value: "ticket", label: "Tickets" },
	{ value: "project_member", label: "Members" },
	{ value: "project", label: "Project" },
	{ value: "comment", label: "Comments" },
];

function getInitials(name: string | null | undefined): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

function formatRelative(iso: string): string {
	const then = new Date(iso).getTime();
	const now = Date.now();
	const diff = Math.round((then - now) / 1000);
	const abs = Math.abs(diff);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	if (abs < 60) return rtf.format(Math.round(diff), "second");
	if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
	if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
	if (abs < 604800) return rtf.format(Math.round(diff / 86400), "day");
	return new Date(iso).toLocaleDateString();
}

function dayKey(iso: string): string {
	const d = new Date(iso);
	const today = new Date();
	const yest = new Date();
	yest.setDate(today.getDate() - 1);
	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
	if (sameDay(d, today)) return "Today";
	if (sameDay(d, yest)) return "Yesterday";
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function entityLabel(entry: ActivityEntry): string {
	const md = entry.metadata as Record<string, unknown>;
	const title = (md.title as string) ?? (md.name as string) ?? "";
	const code = md.ticket_code as string | undefined;
	if (entry.entity_type === "ticket") {
		return code ? `${code} ${title}` : title || "ticket";
	}
	if (entry.entity_type === "project_member") {
		return (md.target_user_name as string) ?? "member";
	}
	return title || entry.entity_type;
}

function actionVerb(entry: ActivityEntry): string {
	const md = entry.metadata as Record<string, unknown>;
	switch (entry.action) {
		case "task.created":
			return "created task";
		case "task.updated":
			return "updated task";
		case "task.deleted":
			return "deleted task";
		case "task.moved":
			return "moved task";
		case "task.status_changed":
			return `changed task status to ${(md.to as string) ?? ""}`.trim();
		case "ticket.created":
			return "created ticket";
		case "ticket.updated":
			return "updated ticket";
		case "ticket.closed":
			return "closed ticket";
		case "ticket.deleted":
			return "deleted ticket";
		case "ticket.status_changed":
			return `changed ticket status to ${(md.to as string) ?? ""}`.trim();
		case "member.added":
			return `added member with role ${(md.role as string) ?? ""}`.trim();
		case "member.role_changed":
			return `changed role from ${(md.from_role as string) ?? "?"} to ${
				(md.to_role as string) ?? "?"
			}`;
		case "member.removed":
			return "removed member";
		case "project.created":
			return "created project";
		case "project.updated":
			return "updated project";
		case "project.deleted":
			return "deleted project";
		case "comment.created":
			return "commented";
		case "comment.updated":
			return "edited comment";
		case "comment.deleted":
			return "deleted comment";
		default:
			return entry.action.replace(/[._]/g, " ");
	}
}

function ActorAvatar({ actor }: { actor: ActivityEntry["actor"] }) {
	const initials = getInitials(actor?.full_name ?? actor?.email ?? null);
	return (
		<Avatar className="h-8 w-8 shrink-0">
			<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
				{initials}
			</AvatarFallback>
		</Avatar>
	);
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
	const actorName = entry.actor?.full_name ?? entry.actor?.email ?? "Someone";
	const md = entry.metadata as Record<string, unknown>;
	const label = entityLabel(entry);
	const snippet = md.snippet as string | undefined;

	return (
		<li className="flex items-start gap-3 py-3">
			<ActorAvatar actor={entry.actor} />
			<div className="flex-1 min-w-0">
				<div className="text-sm leading-relaxed">
					<span className="font-medium">{actorName}</span>{" "}
					<span className="text-muted-foreground">
						{actionVerb(entry)}
					</span>{" "}
					{label && (
						<span className="font-medium break-words">{label}</span>
					)}
					{entry.source === "system_logs" && (
						<Badge
							variant="outline"
							className="ml-2 text-[10px] uppercase tracking-wide"
						>
							legacy
						</Badge>
					)}
				</div>
				{snippet && (
					<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
						“{snippet}”
					</p>
				)}
			</div>
			<time
				className="text-xs text-muted-foreground whitespace-nowrap pt-1"
				dateTime={entry.created_at}
				title={new Date(entry.created_at).toLocaleString()}
			>
				{formatRelative(entry.created_at)}
			</time>
		</li>
	);
}

interface ProjectActivityFeedProps {
	projectId: string;
}

export function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
	const [entries, setEntries] = useState<ActivityEntry[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<FilterValue>("all");

	const load = useCallback(
		async (opts: { page: number; reset: boolean; filter: FilterValue }) => {
			if (opts.reset) {
				setLoading(true);
				setError(null);
			} else {
				setLoadingMore(true);
			}
			try {
				const res = await listProjectActivity(projectId, {
					page: opts.page,
					limit: PAGE_SIZE,
					entityType:
						opts.filter === "all" ? undefined : opts.filter,
				});
				setTotalPages(res.totalPages);
				setEntries((prev) =>
					opts.reset ? res.data : [...prev, ...res.data],
				);
				setPage(res.page);
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Failed to load activity.";
				setError(msg);
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[projectId],
	);

	useEffect(() => {
		load({ page: 1, reset: true, filter });
	}, [load, filter]);

	const grouped = useMemo(() => {
		const groups: { key: string; rows: ActivityEntry[] }[] = [];
		for (const e of entries) {
			const k = dayKey(e.created_at);
			const last = groups[groups.length - 1];
			if (last && last.key === k) last.rows.push(e);
			else groups.push({ key: k, rows: [e] });
		}
		return groups;
	}, [entries]);

	if (loading) {
		return (
			<Card className="p-5 w-full">
				<div className="space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-start gap-3">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3 w-2/3" />
								<Skeleton className="h-3 w-1/3" />
							</div>
						</div>
					))}
				</div>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="p-5 w-full">
				<div className="flex flex-col items-center gap-3 py-8 text-center">
					<AlertCircle className="h-6 w-6 text-danger" />
					<p className="text-sm text-muted-foreground">{error}</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => load({ page: 1, reset: true, filter })}
					>
						Try again
					</Button>
				</div>
			</Card>
		);
	}

	return (
		<Card className="p-5 w-full">
			<div className="flex flex-wrap items-center gap-2 mb-4">
				{FILTERS.map((f) => (
					<Button
						key={f.value}
						variant={filter === f.value ? "default" : "outline"}
						size="sm"
						onClick={() => setFilter(f.value)}
						className="h-7 px-3 text-xs"
					>
						{f.label}
					</Button>
				))}
			</div>

			{entries.length === 0 ? (
				<div className="flex flex-col items-center gap-2 py-12 text-center">
					<Activity className="h-6 w-6 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						No activity yet.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{grouped.map((g) => (
						<div key={g.key}>
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
								{g.key}
							</div>
							<ul className="divide-y divide-border">
								{g.rows.map((e) => (
									<ActivityRow key={e.id} entry={e} />
								))}
							</ul>
						</div>
					))}

					{page < totalPages && (
						<div className="pt-2 flex justify-center">
							<Button
								variant="outline"
								size="sm"
								disabled={loadingMore}
								onClick={() =>
									load({
										page: page + 1,
										reset: false,
										filter,
									})
								}
							>
								{loadingMore ? (
									<>
										<Loader2 className="h-3 w-3 mr-2 animate-spin" />
										Loading…
									</>
								) : (
									"Load more"
								)}
							</Button>
						</div>
					)}
				</div>
			)}
		</Card>
	);
}

export default ProjectActivityFeed;
