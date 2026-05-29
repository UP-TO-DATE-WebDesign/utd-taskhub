import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { listAllTasks, type Task } from "@/services/task.service";
import {
	STATUS_BADGE,
	formatSprintRange,
} from "@/components/sprints/sprint-utils";
import {
	STATUS_BADGE as TASK_STATUS_BADGE,
	getInitials,
	profileColorClass,
	formatTime,
} from "@/components/tasks/types";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────────────────────────

// Display order for task status groups; unknown keys sort last.
const STATUS_ORDER = ["done", "qa", "in-progress", "todo", "backlog", "cancelled"];

function humanizeStatus(status: string): string {
	return status
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

function groupTasksByStatus(tasks: Task[]): { status: string; tasks: Task[] }[] {
	const map = new Map<string, Task[]>();
	for (const t of tasks) {
		const list = map.get(t.status) ?? [];
		list.push(t);
		map.set(t.status, list);
	}
	return [...map.entries()]
		.sort(([a], [b]) => {
			const ia = STATUS_ORDER.indexOf(a);
			const ib = STATUS_ORDER.indexOf(b);
			return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
		})
		.map(([status, tasks]) => ({ status, tasks }));
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function SprintTaskRow({ task }: { task: Task }) {
	const assignee = task.assigned_to;
	const badge = TASK_STATUS_BADGE[task.status];
	return (
		<Card className="flex items-center gap-3 px-4 py-3">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<Badge variant={task.priority} className="text-[10px] shrink-0">
						{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
					</Badge>
					{task.ticket?.ticket_code && (
						<span className="text-[10px] bg-muted-subtle text-muted-foreground px-1.5 py-0.5 rounded font-medium font-mono">
							#{task.ticket.ticket_code}
						</span>
					)}
					<Badge
						variant={badge?.variant ?? "todo"}
						className="text-[10px] shrink-0"
					>
						{badge?.label ?? humanizeStatus(task.status)}
					</Badge>
				</div>
				<p className="text-sm font-medium text-foreground mt-1 truncate">
					{task.title}
				</p>
			</div>

			<div className="flex items-center gap-4 shrink-0">
				{task.estimated_time != null && task.estimated_time > 0 && (
					<div className="flex items-center gap-1 text-[11px] text-muted">
						<Clock className="h-3 w-3" />
						{formatTime(task.estimated_time)}
					</div>
				)}
				{task.due_date && (
					<div className="flex items-center gap-1 text-[11px] text-muted">
						<Calendar className="h-3 w-3" />
						{formatDate(task.due_date.slice(0, 10))}
					</div>
				)}
				{assignee ? (
					<Avatar className="h-6 w-6">
						{assignee.avatar_url && (
							<AvatarImage
								src={assignee.avatar_url}
								alt={assignee.full_name ?? ""}
							/>
						)}
						<AvatarFallback
							className={`text-[9px] text-white ${profileColorClass(assignee.id)}`}
						>
							{getInitials(assignee.full_name ?? assignee.email)}
						</AvatarFallback>
					</Avatar>
				) : (
					<span className="h-6 w-6" />
				)}
			</div>
		</Card>
	);
}

// ── Sprint Page ─────────────────────────────────────────────────────────────

export default function SprintPage() {
	const { sprintId } = useParams<{ sprintId: string }>();
	const navigate = useNavigate();
	const [sprint, setSprint] = useState<Sprint | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (!sprintId) return;
		let active = true;
		setLoading(true);
		setNotFound(false);
		Promise.all([listSprints(), listAllTasks({ sprint_id: sprintId })])
			.then(([sprints, sprintTasks]) => {
				if (!active) return;
				const found = sprints.find((s) => s.id === sprintId) ?? null;
				setSprint(found);
				setNotFound(!found);
				setTasks(sprintTasks);
			})
			.catch(() => {
				if (active) toast.error("Failed to load sprint");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [sprintId]);

	const groups = useMemo(() => groupTasksByStatus(tasks), [tasks]);

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<Button
				variant="ghost"
				size="sm"
				className="mb-4 -ml-2 text-muted hover:text-foreground"
				onClick={() => navigate("/sprints")}
			>
				<ArrowLeft className="h-4 w-4 mr-1.5" />
				Back to sprints
			</Button>

			{loading ? (
				<div className="flex items-center justify-center py-24 text-muted">
					<Loader2 className="h-5 w-5 animate-spin" />
				</div>
			) : notFound || !sprint ? (
				<Card className="p-12 text-center">
					<p className="text-sm font-medium text-foreground mb-1">
						Sprint not found
					</p>
					<p className="text-sm text-muted">
						This sprint may have been deleted.
					</p>
				</Card>
			) : (
				<>
					<div className="flex items-start justify-between gap-4 mb-6">
						<div className="min-w-0">
							<h1 className="text-xl font-semibold text-foreground">
								{sprint.name}
							</h1>
							<p className="text-sm text-muted mt-1">
								{formatSprintRange(sprint.start_date, sprint.end_date)}
							</p>
						</div>
						<Badge
							variant={STATUS_BADGE[sprint.status].variant}
							className="shrink-0"
						>
							{STATUS_BADGE[sprint.status].label}
						</Badge>
					</div>

					<div className="flex items-center gap-2 mb-4">
						<h2 className="text-sm font-semibold text-foreground">Tasks</h2>
						<span className="text-xs font-medium text-muted bg-muted-subtle px-2 py-0.5 rounded-full">
							{tasks.length}
						</span>
					</div>

					{tasks.length === 0 ? (
						<Card className="p-12 text-center">
							<p className="text-sm font-medium text-foreground mb-1">
								No tasks in this sprint
							</p>
							<p className="text-sm text-muted">
								Tasks assigned to this sprint will appear here.
							</p>
						</Card>
					) : (
						<div className="space-y-6">
							{groups.map(({ status, tasks: groupTasks }) => (
								<div key={status}>
									<div className="flex items-center gap-2 mb-2">
										<span className="text-xs font-semibold uppercase tracking-wide text-muted">
											{TASK_STATUS_BADGE[status]?.label ??
												humanizeStatus(status)}
										</span>
										<span className="text-xs text-muted">
											{groupTasks.length}
										</span>
									</div>
									<div className="space-y-2">
										{groupTasks.map((task) => (
											<SprintTaskRow key={task.id} task={task} />
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}
