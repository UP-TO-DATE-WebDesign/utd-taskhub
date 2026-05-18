import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
	Loader2,
	Plus,
	Pencil,
	Trash2,
	Calendar,
	Clock,
	Link2,
	Paperclip,
	MessageSquare,
	ListChecks,
	Check,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogClose,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	ProjectDescriptionEditor,
	ProjectDescriptionPreview,
} from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermission } from "@/hooks/usePermission";
import { type Project } from "@/services/project.service";
import {
	type ApiTaskStatus,
	type ApiTaskPriority,
	type UpdateTaskPayload,
} from "@/services/task.service";
import { type Profile } from "@/services/profile.service";
import {
	type UiTask,
	STATUS_BADGE,
	formatTime,
	TIME_INCREMENTS,
	getInitials,
	profileColorClass,
} from "./types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: ApiTaskStatus[] = [
	"backlog",
	"todo",
	"in_progress",
	"review",
	"done",
	"cancelled",
];

const PRIORITY_OPTIONS: ApiTaskPriority[] = ["urgent", "high", "medium", "low"];

const PRIORITY_LABEL: Record<ApiTaskPriority, string> = {
	low: "LOW PRIORITY",
	medium: "MEDIUM PRIORITY",
	high: "HIGH PRIORITY",
	urgent: "URGENT",
};

const PRIORITY_CHIP: Record<ApiTaskPriority, string> = {
	low: "bg-slate-100 text-slate-700",
	medium: "bg-primary/10 text-primary",
	high: "bg-rose-100 text-rose-700",
	urgent: "bg-red-100 text-red-700",
};

const UNASSIGNED_VALUE = "__unassigned__";

function shortTaskRef(task: UiTask, project?: Project): string {
	const prefix = project?.name
		? project.name
				.split(/\s+/)
				.map((w) => w[0])
				.join("")
				.slice(0, 4)
				.toUpperCase()
		: "TASK";
	return `${prefix}-${task.id.slice(0, 4).toUpperCase()}`;
}

function reportError(e: unknown) {
	toast.error("Failed to update task", {
		description: (e as Error).message || "Please try again.",
	});
}

interface Props {
	task: UiTask | null;
	projects: Project[];
	profiles?: Profile[];
	allTasks?: UiTask[];
	onClose: () => void;
	onSaveNotes: (task: UiTask, notes: string) => Promise<void>;
	onUpdate?: (task: UiTask, payload: UpdateTaskPayload) => Promise<void>;
	onChangeStatus?: (task: UiTask, status: ApiTaskStatus) => Promise<void>;
	onAddChild?: (parent: UiTask) => void;
	onOpenTask?: (task: UiTask) => void;
	onEdit?: (task: UiTask) => void;
	onDelete?: (task: UiTask) => void;
	onToggleChildDone?: (child: UiTask) => Promise<void>;
}

export function TaskDetailDialogV2({
	task,
	projects,
	profiles = [],
	allTasks = [],
	onClose,
	onSaveNotes,
	onUpdate,
	onChangeStatus,
	onAddChild,
	onOpenTask,
	onEdit,
	onDelete,
	onToggleChildDone,
}: Props) {
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [statusSaving, setStatusSaving] = useState(false);
	const [showNotesEditor, setShowNotesEditor] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const { can } = usePermission();
	const canEdit = !!onUpdate && can("Create & edit tasks");
	const canEditStatus = !!onChangeStatus && can("Create & edit tasks");

	useEffect(() => {
		if (task) {
			setNotes(task.developer_notes ?? "");
			setShowNotesEditor(false);
			setConfirmingDelete(false);
		}
	}, [task]);

	const project = projects.find((p) => p.id === task?.project_id);

	const children = useMemo(
		() =>
			task ? allTasks.filter((t) => t.parent_task_id === task.id) : [],
		[allTasks, task],
	);

	const completedCount = children.filter(
		(c) => c.apiStatus === "done",
	).length;
	const progress = children.length
		? Math.round((completedCount / children.length) * 100)
		: 0;

	async function persist(payload: UpdateTaskPayload) {
		if (!task || !onUpdate) return;
		await onUpdate(task, payload);
	}

	async function handleSave() {
		if (!task) return;
		setSaving(true);
		try {
			await onSaveNotes(task, notes);
			setShowNotesEditor(false);
		} finally {
			setSaving(false);
		}
	}

	async function handleStatusChange(next: string) {
		if (!task || !onChangeStatus) return;
		const nextStatus = next as ApiTaskStatus;
		if (nextStatus === task.apiStatus) return;
		setStatusSaving(true);
		try {
			await onChangeStatus(task, nextStatus);
		} catch (e) {
			toast.error("Failed to update status", {
				description: (e as Error).message || "Please try again.",
			});
		} finally {
			setStatusSaving(false);
		}
	}

	function handleCopyLink() {
		if (!task) return;
		const url = `${window.location.origin}/tasks?taskId=${task.id}`;
		navigator.clipboard
			.writeText(url)
			.then(() =>
				toast.success("Link copied", {
					description: "Task URL on clipboard",
				}),
			)
			.catch(() => toast.error("Failed to copy link"));
	}

	return (
		<>
		<Dialog
			open={!!task}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-5xl p-0 overflow-hidden">
				{/* Top bar */}
				<div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
					<div className="flex items-center gap-3 min-w-0">
						<DialogClose className="rounded-md p-1 text-danger hover:text-foreground hover:bg-muted-subtle"></DialogClose>
						{task && (
							<>
								<InlinePriority
									value={task.priority}
									canEdit={canEdit}
									onSave={(p) => persist({ priority: p })}
								/>
								<span className="text-sm text-muted">/</span>
								<span className="text-sm font-medium text-foreground truncate">
									{shortTaskRef(task, project)}
								</span>
							</>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0 pr-8">
						{task && onEdit && (
							<PermissionGate feature="Create & edit tasks">
								<Button
									variant="primary_outline"
									size="sm"
									className="text-foreground"
									onClick={() => onEdit(task)}
								>
									<Pencil className="h-3.5 w-3.5" />
									<span className="text-[12px]">Edit</span>
								</Button>
							</PermissionGate>
						)}
						{task && onDelete && (
							<PermissionGate feature="Create & edit tasks">
								<Button
									variant="destructive_outline"
									size="sm"
									className="text-foreground hover:text-danger"
									onClick={() => setConfirmingDelete(true)}
								>
									<Trash2 className="h-3.5 w-3.5" />
									<span className="text-[12px]">Delete</span>
								</Button>
							</PermissionGate>
						)}
					</div>
				</div>

				{/* Body */}
				<div className="grid grid-cols-1 md:grid-cols-[1fr_300px] max-h-[80vh] overflow-hidden">
					{/* Main column */}
					<div className="overflow-y-auto px-6 py-6 space-y-7 max-h-[80vh]">
						{/* Title + description */}
						<div>
							{task && (
								<InlineTitle
									value={task.title}
									canEdit={canEdit}
									onSave={(v) => persist({ title: v })}
								/>
							)}
							{task && (
								<InlineDescription
									value={task.description ?? ""}
									canEdit={canEdit}
									onSave={(v) => persist({ description: v })}
								/>
							)}
						</div>

						{/* Subtasks */}
						<section>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<ListChecks className="h-4 w-4 text-muted" />
									<h3 className="text-sm font-semibold text-foreground">
										Subtasks
									</h3>
									<span className="text-xs text-muted">
										({children.length})
									</span>
								</div>
								{children.length > 0 && (
									<span className="text-xs font-medium text-primary">
										{progress}% Complete
									</span>
								)}
							</div>
							{children.length > 0 && (
								<div className="h-1.5 w-full rounded-full bg-muted-subtle overflow-hidden mb-3">
									<div
										className="h-full bg-primary transition-all"
										style={{ width: `${progress}%` }}
									/>
								</div>
							)}
							{children.length === 0 ? (
								<div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
									<p className="text-xs text-muted mb-2">
										No subtasks yet
									</p>
									{task && onAddChild && (
										<PermissionGate feature="Create & edit tasks">
											<Button
												variant="outline"
												size="sm"
												onClick={() => onAddChild(task)}
											>
												<Plus className="h-3 w-3 mr-1" />
												Add subtask
											</Button>
										</PermissionGate>
									)}
								</div>
							) : (
								<div className="rounded-lg border border-border bg-muted-subtle/30 p-3 space-y-1.5">
									{children.map((child) => {
										const done = child.apiStatus === "done";
										return (
											<div
												key={child.id}
												className="flex items-center gap-2.5 group"
											>
												<button
													type="button"
													onClick={() =>
														onToggleChildDone?.(
															child,
														)
													}
													className={`h-4 w-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
														done
															? "bg-primary border-primary text-white"
															: "border-border-strong bg-surface hover:border-primary"
													}`}
													aria-label={
														done
															? "Mark not done"
															: "Mark done"
													}
													disabled={
														!onToggleChildDone
													}
												>
													{done && (
														<Check className="h-3 w-3" />
													)}
												</button>
												<button
													type="button"
													onClick={() =>
														onOpenTask?.(child)
													}
													className={`flex-1 text-left text-sm truncate transition-colors ${
														done
															? "line-through text-muted"
															: "text-foreground hover:text-primary"
													}`}
												>
													{child.title}
												</button>
												<Badge
													variant={
														STATUS_BADGE[
															child.apiStatus
														].variant
													}
													className="text-[9px] shrink-0"
												>
													{
														STATUS_BADGE[
															child.apiStatus
														].label
													}
												</Badge>
											</div>
										);
									})}
									{task && onAddChild && (
										<PermissionGate feature="Create & edit tasks">
											<button
												type="button"
												onClick={() => onAddChild(task)}
												className="flex items-center gap-2 text-xs text-muted hover:text-primary pt-1.5"
											>
												<Plus className="h-3 w-3" />
												Add subtask
											</button>
										</PermissionGate>
									)}
								</div>
							)}
						</section>

						{/* Attachments (placeholder) */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<Paperclip className="h-4 w-4 text-muted" />
								<h3 className="text-sm font-semibold text-foreground">
									Attachments
								</h3>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
								<button
									type="button"
									disabled
									className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
								>
									<Plus className="h-5 w-5 mb-1" />
									<span className="text-xs font-medium">
										Add New
									</span>
								</button>
							</div>
							<p className="text-[11px] text-muted mt-2 italic">
								Attachments coming soon.
							</p>
						</section>

						{/* Developer notes */}
						<section>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<MessageSquare className="h-4 w-4 text-muted" />
									<h3 className="text-sm font-semibold text-foreground">
										Developer's Notes
									</h3>
								</div>
								<PermissionGate feature="Create & edit tasks">
									<Button
										variant="primary_outline"
										size="sm"
										onClick={() =>
											setShowNotesEditor((v) => !v)
										}
									>
										{showNotesEditor
											? "Cancel"
											: "Edit notes"}
									</Button>
								</PermissionGate>
							</div>
							{showNotesEditor ? (
								<>
									<ProjectDescriptionEditor
										value={notes}
										onChange={setNotes}
										placeholder="Add implementation details, technical context, or notes for the dev team..."
									/>
									<div className="flex justify-end mt-3">
										<Button
											onClick={handleSave}
											disabled={saving}
										>
											{saving && (
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
											)}
											Save Notes
										</Button>
									</div>
								</>
							) : projectDescriptionText(notes) ? (
								<div className="text-sm text-foreground bg-muted-subtle/40 rounded-lg p-3">
									<ProjectDescriptionPreview value={notes} />
								</div>
							) : (
								<p className="text-xs text-muted italic">
									No notes yet.
								</p>
							)}
						</section>
					</div>

					{/* Sidebar */}
					<aside className="border-l border-border bg-muted-subtle/30 overflow-y-auto px-5 py-6 space-y-5">
						{/* Status */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Status
							</p>
							{canEditStatus && task ? (
								<div className="flex items-center gap-2">
									<Select
										value={task.apiStatus}
										onValueChange={handleStatusChange}
										disabled={statusSaving}
									>
										<SelectTrigger className="h-8 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{STATUS_OPTIONS.map((s) => (
												<SelectItem key={s} value={s}>
													{STATUS_BADGE[s].label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{statusSaving && (
										<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
									)}
								</div>
							) : (
								<Badge
									variant={
										STATUS_BADGE[task?.apiStatus ?? "todo"]
											.variant
									}
								>
									{
										STATUS_BADGE[task?.apiStatus ?? "todo"]
											.label
									}
								</Badge>
							)}
						</div>

						<Separator />

						{/* Assignee */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Assignee
							</p>
							{task && (
								<InlineAssignee
									assignee={task.assigned_to}
									profiles={profiles}
									canEdit={canEdit}
									onSave={(v) => persist({ assigned_to: v })}
								/>
							)}
						</div>

						<Separator />

						{/* Project + Sprint */}
						<div className="space-y-3">
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
									Project
								</p>
								<p className="text-sm font-medium text-foreground">
									{project?.name ?? "—"}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
									Sprint
								</p>
								<p className="text-sm font-medium text-foreground">
									{task?.sprint?.name ?? "—"}
								</p>
							</div>
						</div>

						<Separator />

						{/* Due date */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Due Date
							</p>
							{task && (
								<InlineDueDate
									value={task.due_date}
									canEdit={canEdit}
									onSave={(v) => persist({ due_date: v })}
								/>
							)}
						</div>

						{/* Estimation */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Estimation
							</p>
							{task && (
								<InlineEstimatedTime
									value={task.estimated_time}
									canEdit={canEdit}
									onSave={(v) =>
										persist({ estimated_time: v })
									}
								/>
							)}
						</div>

						<Separator />

						{/* Tags */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Tags
							</p>
							{task && (
								<InlineTags
									value={task.tags}
									canEdit={canEdit}
									onSave={(v) => persist({ tags: v })}
								/>
							)}
						</div>

						{/* Copy link */}
						<Button
							variant="outline"
							className="w-full justify-start"
							onClick={handleCopyLink}
						>
							<Link2 className="h-4 w-4 mr-2" />
							Copy Task Link
						</Button>
					</aside>
				</div>
			</DialogContent>
		</Dialog>

		<Dialog
			open={confirmingDelete && !!task}
			onOpenChange={(o) => {
				if (!o) setConfirmingDelete(false);
			}}
		>
			<DialogContent className="max-w-[420px]">
				<DialogHeader>
					<DialogTitle>Delete Task</DialogTitle>
					<DialogDescription>
						This will permanently delete{" "}
						<span className="font-medium text-foreground">
							{task?.title}
						</span>
						. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						variant="destructive"
						className="bg-danger text-white hover:bg-danger/90"
						onClick={() => {
							if (!task || !onDelete) return;
							setConfirmingDelete(false);
							onDelete(task);
						}}
					>
						<Trash2 className="h-4 w-4 mr-1.5" />
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}

// ── Inline edit field components ─────────────────────────────────────────────

function InlineTitle({
	value,
	canEdit,
	onSave,
}: {
	value: string;
	canEdit: boolean;
	onSave: (v: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	async function commit() {
		const next = draft.trim();
		if (!next || next === value) {
			setDraft(value);
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(next);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(value);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(value);
		setEditing(false);
	}

	if (!editing) {
		return (
			<h2
				onClick={() => canEdit && setEditing(true)}
				className={cn(
					"text-2xl font-semibold text-foreground tracking-tight mb-2",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{value}
			</h2>
		);
	}

	return (
		<div className="flex items-center gap-2 mb-2">
			<Input
				autoFocus
				value={draft}
				disabled={saving}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					} else if (e.key === "Escape") {
						e.preventDefault();
						e.stopPropagation();
						cancel();
					}
				}}
				className="text-2xl font-semibold h-11"
			/>
			{saving && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
		</div>
	);
}

function InlineDescription({
	value,
	canEdit,
	onSave,
}: {
	value: string;
	canEdit: boolean;
	onSave: (v: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	async function commit() {
		if (saving) return;
		if (draft === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(draft);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(value);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(value);
		setEditing(false);
	}

	const hasText = projectDescriptionText(value);

	if (!editing) {
		return (
			<div
				onClick={() => canEdit && setEditing(true)}
				className={cn(
					"text-sm leading-relaxed",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{hasText ? (
					<div className="text-muted">
						<ProjectDescriptionPreview value={value} />
					</div>
				) : (
					<p className="text-muted italic">
						No description provided.
					</p>
				)}
			</div>
		);
	}

	return (
		<div
			className="relative"
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					e.stopPropagation();
					cancel();
				}
			}}
		>
			<ProjectDescriptionEditor
				inline
				autoFocus
				value={draft}
				onChange={setDraft}
				onBlur={commit}
				placeholder="Describe the task..."
			/>
			{saving && (
				<Loader2 className="absolute right-1 top-1 h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}

function InlinePriority({
	value,
	canEdit,
	onSave,
}: {
	value: ApiTaskPriority;
	canEdit: boolean;
	onSave: (v: ApiTaskPriority) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	async function pick(next: ApiTaskPriority) {
		if (next === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(next);
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
			setEditing(false);
		}
	}

	if (!canEdit) {
		return (
			<span
				className={cn(
					"text-[10px] font-bold tracking-wider px-2 py-1 rounded",
					PRIORITY_CHIP[value],
				)}
			>
				{PRIORITY_LABEL[value]}
			</span>
		);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className={cn(
					"text-[10px] font-bold tracking-wider px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
					PRIORITY_CHIP[value],
				)}
			>
				{PRIORITY_LABEL[value]}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-1.5">
			<Select
				defaultOpen
				value={value}
				onValueChange={(v) => pick(v as ApiTaskPriority)}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-7 text-[10px] px-2 py-1 min-w-[140px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{PRIORITY_OPTIONS.map((p) => (
						<SelectItem key={p} value={p}>
							{PRIORITY_LABEL[p]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
		</div>
	);
}

function InlineAssignee({
	assignee,
	profiles,
	canEdit,
	onSave,
}: {
	assignee: UiTask["assigned_to"];
	profiles: Profile[];
	canEdit: boolean;
	onSave: (v: string | null) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const currentId = assignee?.id ?? "";

	async function pick(v: string) {
		const next = v === UNASSIGNED_VALUE ? null : v;
		if ((next ?? "") === currentId) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(next);
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
			setEditing(false);
		}
	}

	const readView = assignee ? (
		<div className="flex items-center gap-2">
			<Avatar className="h-8 w-8">
				<AvatarFallback
					className={`text-[10px] text-white ${profileColorClass(assignee.id)}`}
				>
					{getInitials(assignee.full_name ?? assignee.email)}
				</AvatarFallback>
			</Avatar>
			<span className="text-sm font-medium text-foreground truncate">
				{assignee.full_name ?? assignee.email}
			</span>
		</div>
	) : (
		<p className="text-sm text-muted">Unassigned</p>
	);

	if (!canEdit) return readView;

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="flex items-center gap-2 w-full text-left cursor-pointer rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors"
			>
				{readView}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Select
				defaultOpen
				value={currentId || UNASSIGNED_VALUE}
				onValueChange={pick}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
					{profiles.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.full_name ?? p.email}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}

function InlineDueDate({
	value,
	canEdit,
	onSave,
}: {
	value: string | null;
	canEdit: boolean;
	onSave: (v: string | null) => Promise<void>;
}) {
	const initial = value ? value.slice(0, 10) : "";
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(initial);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(initial);
	}, [initial]);

	async function commit() {
		if (draft === initial) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(draft || null);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(initial);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(initial);
		setEditing(false);
	}

	const label = value ? format(new Date(value), "MMM d, yyyy") : "—";

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"flex items-center gap-2 text-sm text-foreground w-full text-left",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				<Calendar className="h-4 w-4 text-muted" />
				{label}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Input
				type="date"
				autoFocus
				value={draft}
				disabled={saving}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					} else if (e.key === "Escape") {
						e.preventDefault();
						e.stopPropagation();
						cancel();
					}
				}}
				className="h-8 text-xs"
			/>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}

function InlineEstimatedTime({
	value,
	canEdit,
	onSave,
}: {
	value: number;
	canEdit: boolean;
	onSave: (v: number) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [inputMode, setInputMode] = useState(false);
	const [draft, setDraft] = useState(String(value || ""));
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(String(value || ""));
	}, [value]);

	async function commit() {
		const num = parseInt(draft, 10);
		const safe = Number.isFinite(num) && num > 0 ? num : 0;
		if (safe === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(safe);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(String(value || ""));
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(String(value || ""));
		setEditing(false);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"flex items-center gap-2 text-sm text-foreground w-full text-left",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				<Clock className="h-4 w-4 text-muted" />
				{value ? formatTime(value) : "—"}
			</button>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-2 bg-white p-2 border rounded-md border-border">
				{inputMode ? (
					<div className="flex flex-col gap-2 pt-2">
						<span className="text-xs absolute mt-2 right-10 text-center">
							min{parseFloat(draft) > 1 ? "s" : ""}
						</span>
						<Input
							autoFocus
							value={draft}
							disabled={saving}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									setInputMode(false);
									commit();
								} else if (e.key === "Escape") {
									e.preventDefault();
									e.stopPropagation();
									setInputMode(false);
									cancel();
								}
							}}
							className="text-sm h-8 text-center"
						/>
					</div>
				) : (
					<div
						className={`text-center text-xl font-bold ${inputMode ? "text-foreground bg-backround" : "text-muted"} cursor-pointer`}
						onClick={() => {
							setInputMode(true);
						}}
						title="click to edit"
					>
						{formatTime(parseFloat(draft))}
					</div>
				)}
				<div className="flex items-center justify-center flex-wrap gap-2">
					{TIME_INCREMENTS.map(({ label, delta }) => (
						<span
							key={label}
							className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
							onClick={() => {
								setDraft(
									draft
										? String(parseFloat(draft) + delta)
										: String(delta),
								);
								// onChange(value + delta)
							}}
						>
							{label}
						</span>
					))}
					<span
						className="text-xs text-accent cursor-pointer shadow-xs border border-reset px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
						onClick={() => setDraft("")}
					>
						Reset
					</span>
				</div>
			</div>
			<div className="flex items-center justify-end pt-2 gap-2">
				<Button
					disabled={saving}
					size="sm"
					variant={"ghost"}
					onClick={cancel}
				>
					<span className="text-xs">Cancel</span>
				</Button>
				<Button
					disabled={saving}
					size="sm"
					variant={"default"}
					onClick={commit}
				>
					<span className="text-xs">Save</span>
				</Button>
			</div>
		</>
	);
}

function InlineTags({
	value,
	canEdit,
	onSave,
}: {
	value: string[];
	canEdit: boolean;
	onSave: (v: string[]) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [input, setInput] = useState("");
	const [tags, setTags] = useState<string[]>(value);
	const [saving, setSaving] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTags(value);
	}, [value]);

	async function persistTags(next: string[]) {
		setSaving(true);
		try {
			await onSave(next);
		} catch (e) {
			reportError(e);
			setTags(value);
		} finally {
			setSaving(false);
		}
	}

	function addTag() {
		const t = input.trim();
		if (!t || tags.includes(t)) {
			setInput("");
			return;
		}
		const next = [...tags, t];
		setTags(next);
		setInput("");
		persistTags(next);
	}

	function removeTag(t: string) {
		const next = tags.filter((x) => x !== t);
		setTags(next);
		persistTags(next);
	}

	function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
		if (!containerRef.current) return;
		const nextTarget = e.relatedTarget as Node | null;
		if (nextTarget && containerRef.current.contains(nextTarget)) return;
		if (input.trim()) addTag();
		setEditing(false);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"w-full text-left rounded -mx-1 px-1 py-0.5",
					canEdit &&
						"cursor-text hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{tags.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
							>
								{tag}
							</span>
						))}
					</div>
				) : (
					<p className="text-xs text-muted">No tags</p>
				)}
			</button>
		);
	}

	return (
		<div ref={containerRef} onBlur={handleBlur} className="space-y-2">
			<div className="flex items-center gap-1.5">
				<Input
					autoFocus
					placeholder="Add tag..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							addTag();
						} else if (e.key === "Escape") {
							e.preventDefault();
							e.stopPropagation();
							setInput("");
							setEditing(false);
						}
					}}
					className="h-8 text-xs"
				/>
				{saving && (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted shrink-0" />
				)}
			</div>
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{tags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
						>
							{tag}
							<button
								type="button"
								onClick={() => removeTag(tag)}
								className="text-primary/70 hover:text-primary"
							>
								<X className="h-2.5 w-2.5" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
