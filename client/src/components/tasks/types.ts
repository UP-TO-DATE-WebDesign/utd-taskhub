import {
	type Task as ApiTask,
	type TaskSprint,
	type TaskTypeRef,
	type ApiTaskStatus,
	type ApiTaskPriority,
} from "@/services/task.service";
import type { WorkflowStage } from "@/services/workflow-stage.service";
import { SYSTEM_STAGES } from "./system-stages";

// ── Types ─────────────────────────────────────────────────────────────────────

// ColumnId is now any workflow_stages.key for the task's project.
export type ColumnId = string;
export type Columns = Record<string, UiTask[]>;

export interface UiTask {
	id: string;
	project_id: string;
	ticket_id: string | null;
	ticket_code: string | null;
	title: string;
	description: string | null;
	developer_notes: string | null;
	apiStatus: ApiTaskStatus;
	columnId: ColumnId;
	priority: ApiTaskPriority;
	assigned_to: ApiTask["assigned_to"];
	created_by: ApiTask["created_by"] | null;
	due_date: string | null;
	tags: string[];
	estimated_time: number;
	sprint: TaskSprint | null;
	parent_task_id: string | null;
	task_type_id: string | null;
	task_type: TaskTypeRef | null;
}

// ── System-stage-derived display fallbacks ────────────────────────────────────
// These keep cross-project surfaces (sprint rows, dashboard charts) rendering
// the 6 system stages without each callsite needing a stages prop. Per-project
// surfaces that must show custom stages pass `stages` explicitly to the helpers
// below.

const STATUS_VARIANT: Record<
	string,
	"backlog" | "todo" | "in-progress" | "review" | "done" | "cancelled"
> = {
	backlog: "backlog",
	todo: "todo",
	"in-progress": "in-progress",
	qa: "review",
	done: "done",
	cancelled: "cancelled",
};

export const COLUMN_IDS: ColumnId[] = SYSTEM_STAGES.filter(
	(s) => s.key !== "cancelled",
).map((s) => s.key);

export const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
	SYSTEM_STAGES.map((s) => [s.key, s.name]),
);

export const COLUMN_BADGE: Record<
	string,
	{
		variant: "backlog" | "todo" | "in-progress" | "review" | "done";
		dot: string;
	}
> = {
	backlog: { variant: "backlog", dot: "bg-muted" },
	todo: { variant: "todo", dot: "bg-muted" },
	"in-progress": { variant: "in-progress", dot: "bg-primary" },
	qa: { variant: "review", dot: "bg-secondary" },
	done: { variant: "done", dot: "bg-secondary" },
};

export const STATUS_BADGE: Record<
	string,
	{
		variant:
			| "backlog"
			| "todo"
			| "in-progress"
			| "review"
			| "done"
			| "cancelled";
		label: string;
	}
> = Object.fromEntries(
	SYSTEM_STAGES.map((s) => [
		s.key,
		{ variant: STATUS_VARIANT[s.key] ?? "todo", label: s.name },
	]),
);

export const PRIORITY_BORDER: Record<ApiTaskPriority, string> = {
	urgent: "border border-danger/20 hover:border-danger/50 hover:shadow-danger/20",
	high: "border border-warning/20 hover:border-warning/50 hover:shadow-warning/20",
	medium: "border border-primary/20 hover:border-primary/50 hover:shadow-primary/20",
	low: "border border-gray-500/20 hover:border-gray-500/50 hover:shadow-gray-500/20",
};

export const AVATAR_COLORS = [
	"bg-primary",
	"bg-accent",
	"bg-secondary",
	"bg-warning",
	"bg-danger",
];

export const TIME_INCREMENTS: { label: string; delta: number }[] = [
	{ label: "+5 mins", delta: 5 },
	{ label: "+15 mins", delta: 15 },
	{ label: "+30 mins", delta: 30 },
	{ label: "+1 hour", delta: 60 },
	{ label: "+8 hour", delta: 60 * 8 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Status and ColumnId are the same value (workflow_stages.key). These remain as
// identity functions to minimize churn at call sites.
export function apiStatusToColumnId(status: ApiTaskStatus): ColumnId {
	return status;
}

export function columnIdToApiStatus(colId: ColumnId): ApiTaskStatus {
	return colId;
}

export function toUiTask(t: ApiTask): UiTask {
	return {
		id: t.id,
		project_id: t.project_id,
		ticket_id: t.ticket_id ?? null,
		ticket_code: t.ticket?.ticket_code ?? null,
		title: t.title,
		description: t.description,
		developer_notes: t.developer_notes,
		apiStatus: t.status,
		columnId: t.status,
		priority: t.priority,
		assigned_to: t.assigned_to,
		created_by: t.created_by ?? null,
		due_date: t.due_date,
		tags: t.tags ?? [],
		estimated_time: t.estimated_time ?? 0,
		sprint: t.sprint ?? null,
		parent_task_id: t.parent_task_id ?? null,
		task_type_id: t.task_type_id ?? null,
		task_type: t.task_type ?? null,
	};
}

export function getStage(
	key: string,
	stages: WorkflowStage[] = SYSTEM_STAGES,
): WorkflowStage | undefined {
	return (
		stages.find((s) => s.key === key) ??
		SYSTEM_STAGES.find((s) => s.key === key)
	);
}

export function getStageLabel(key: string, stages?: WorkflowStage[]): string {
	return getStage(key, stages)?.name ?? key;
}

export function getStageColor(key: string, stages?: WorkflowStage[]): string {
	return getStage(key, stages)?.color ?? "#64748b";
}

export function sortStages(stages: WorkflowStage[]): WorkflowStage[] {
	return [...stages].sort((a, b) => a.position - b.position);
}

export function emptyColumns(stages: WorkflowStage[] = SYSTEM_STAGES): Columns {
	const cols: Columns = {};
	for (const s of stages) cols[s.key] = [];
	return cols;
}

export function buildColumns(
	tasks: UiTask[],
	stages: WorkflowStage[] = SYSTEM_STAGES,
): Columns {
	const cols = emptyColumns(stages);
	for (const task of tasks) {
		const key = task.columnId;
		if (!cols[key]) cols[key] = [];
		cols[key].push(task);
	}
	return cols;
}

export function getInitials(name: string | null | undefined): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function profileColorClass(id: string): string {
	const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function formatTime(minutes: number): string {
	if (!minutes) return "0 min";
	if (minutes == 1) return "1 min";
	if (minutes < 60) return `${minutes} mins`;
	const hours = Math.floor(minutes / 60);
	const rem = minutes % 60;
	if (rem === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
	return `${hours} hr${hours > 1 ? "s" : ""} ${rem} min`;
}
