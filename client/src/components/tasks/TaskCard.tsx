import { memo, useMemo, useState } from "react";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
	Calendar,
	Clock,
	GripVertical,
	Trash2,
	CheckCircle2,
	Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon-picker";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import { type Project } from "@/services/project.service";
import {
	type UiTask,
	type ColumnId,
	COLUMN_IDS,
	PRIORITY_BORDER,
	getInitials,
	profileColorClass,
	formatTime,
} from "./types";
import type { WorkflowStage } from "@/services/workflow-stage.service";

// ── TaskCardContent ───────────────────────────────────────────────────────────

function TaskCardContentBase({
	task,
	projects,
	isDragging = false,
}: {
	task: UiTask;
	projects: Project[];
	isDragging?: boolean;
}) {
	const projectName =
		projects.find((p) => p.id === task.project_id)?.name ?? "—";
	const assignee = task.assigned_to;

	return (
		<div
			className={cn(
				"bg-surface rounded-lg border border-border p-3.5 transition-all flex flex-col gap-2.5 select-none",
				PRIORITY_BORDER[task.priority],
				isDragging
					? "shadow-xl opacity-90 rotate-1"
					: "shadow-xs hover:shadow-md",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-1.5 flex-wrap">
					{task.task_type && (
						<span
							className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[12px] font-medium leading-none absolute right-4 transition-all duration-200 group-hover:right-8 top-4"
							style={{
								// background: `${task.task_type.color}1a`,
								color: task.task_type.color,
							}}
							title={task.task_type.name}
						>
							<Icon
								name={task.task_type.icon as IconName}
								className="h-3 w-3"
							/>
							{task.task_type.name}
						</span>
					)}
					<Badge variant={task.priority} className="text-[10px]">
						{task.priority.charAt(0).toUpperCase() +
							task.priority.slice(1)}
					</Badge>
					{task.ticket_id && (
						<span className="text-[10px] bg-muted-subtle text-muted-foreground px-1.5 py-0.5 rounded font-medium leading-none font-mono">
							#{task.ticket_id}
						</span>
					)}
				</div>
				{task.tags[0] && (
					<span className="text-[10px] bg-muted-subtle text-muted-foreground px-1.5 py-0.5 rounded font-medium leading-none">
						{task.tags[0]}
					</span>
				)}
			</div>

			<p className="text-sm font-medium text-foreground leading-snug">
				{task.title}
			</p>

			<p className="text-[10px] text-muted">
				{projectName}&nbsp;
				{task.sprint && (
					<>
						<span className="font-bold">&middot;</span>&nbsp;
						{task.sprint.name}
					</>
				)}
			</p>

			<div className="flex items-center justify-between pt-1 border-t border-border">
				{assignee ? (
					<Avatar className="h-5 w-5">
						{assignee?.avatar_url && (
							<AvatarImage
								src={assignee?.avatar_url}
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
					<span />
				)}
				<div className="flex items-center gap-3">
					{task.estimated_time > 0 && (
						<div className="flex items-center gap-1 text-[11px] text-muted">
							<Clock className="h-3 w-3" />
							{formatTime(task.estimated_time)}
						</div>
					)}
					{task.due_date && (
						<div className="flex items-center gap-1 text-[11px] text-muted">
							<Calendar className="h-3 w-3" />
							{task.due_date
								? formatDate(task.due_date.slice(0, 10))
								: "—"}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export const TaskCardContent = memo(TaskCardContentBase);

// ── SortableTaskCard ──────────────────────────────────────────────────────────

function SortableTaskCardBase({
	task,
	projects,
	onEdit,
	onDelete,
	onView,
}: {
	task: UiTask;
	projects: Project[];
	onEdit: (task: UiTask) => void;
	onDelete: (task: UiTask) => void;
	onView: (task: UiTask) => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.35 : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="relative group cursor-pointer rounded-lg overflow-hidden"
			onMouseLeave={() => setConfirming(false)}
			onClick={() => onView(task)}
		>
			<div className="absolute w-1/2 bg-linear-to-r from-white-50 to-white transition-all divide-gray-200 h-full right-0 opacity-0 group-hover:opacity-100" />
			<div
				{...attributes}
				{...listeners}
				className="absolute top-4 bg-white right-1.5 z-10 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted hover:text-primary"
				onClick={(e) => e.stopPropagation()}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<GripVertical className="h-5 w-5" />
					</TooltipTrigger>
					<TooltipContent side="left">
						Click and drag to move task
					</TooltipContent>
				</Tooltip>
			</div>
			<div
				className="absolute top-16 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hidden!"
				onClick={(e) => e.stopPropagation()}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => onEdit(task)}
							className="p-0.5 rounded transition-colors text-muted hover:text-primary"
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="left">
						Click to edit task
					</TooltipContent>
				</Tooltip>
			</div>
			<div
				className="absolute bottom-3 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-4"
				onClick={(e) => e.stopPropagation()}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => onDelete(task)}
							className={cn(
								"text-[11px] font-medium relative text-white bg-secondary px-1.5 py-0.5 rounded transition-all duration-150 gap-1 flex items-center justify-center z-10",
								confirming
									? "opacity-100 translate-x-5"
									: "opacity-0 translate-x-2 pointer-events-none",
							)}
						>
							<CheckCircle2 className="h-3 w-3" />
							Confirm
						</button>
					</TooltipTrigger>
					<TooltipContent side="top">
						This will permanently delete the task
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => setConfirming((prev) => !prev)}
							className={cn(
								"p-0.5 rounded transition-colors",
								confirming
									? "text-danger"
									: "text-muted hover:text-danger",
							)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="left">
						Click to delete task
					</TooltipContent>
				</Tooltip>
			</div>

			<TaskCardContent task={task} projects={projects} />
		</div>
	);
}

export const SortableTaskCard = memo(SortableTaskCardBase);

// ── BoardColumn ───────────────────────────────────────────────────────────────

function BoardColumnBase({
	stage,
	tasks,
	projects,
	onEdit,
	onDelete,
	onView,
}: {
	stage: WorkflowStage;
	tasks: UiTask[];
	projects: Project[];
	onEdit: (task: UiTask) => void;
	onDelete: (task: UiTask) => void;
	onView: (task: UiTask) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: stage.key });
	const itemIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

	return (
		<div className="flex flex-col min-w-[280px] h-[-webkit-fill-available]">
			<div className="flex items-center gap-2 mb-3 px-1">
				<span
					className="h-2 w-2 rounded-full"
					style={{ backgroundColor: stage.color }}
				/>
				<span className="text-sm font-semibold text-foreground">
					{stage.name}
				</span>
				<span className="ml-auto text-xs font-medium text-muted bg-muted-subtle px-2 py-0.5 rounded-full">
					{tasks.length}
				</span>
			</div>

			<div
				ref={setNodeRef}
				className={cn(
					"flex-1 flex flex-col gap-2.5 rounded-xl p-2 min-h-[80vh] transition-colors h-full",
					isOver
						? "bg-primary-subtle/60 border border-dashed border-primary/40"
						: "bg-muted-subtle",
				)}
			>
				<SortableContext
					items={itemIds}
					strategy={verticalListSortingStrategy}
				>
					{tasks.map((task) => (
						<SortableTaskCard
							key={task.id}
							task={task}
							projects={projects}
							onEdit={onEdit}
							onDelete={onDelete}
							onView={onView}
						/>
					))}
				</SortableContext>

				{tasks.length === 0 && (
					<div className="flex-1 flex items-center justify-center py-8">
						<p className="text-xs text-muted">Drop tasks here</p>
					</div>
				)}
			</div>
		</div>
	);
}

export const BoardColumn = memo(BoardColumnBase);

export type { ColumnId, UiTask };
export { COLUMN_IDS };
