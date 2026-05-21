import { useState, useEffect, useMemo } from "react";
import {
	Loader2,
	Plus,
	Pencil,
	Trash2,
	Link2,
	Paperclip,
	MessageSquare,
	MessagesSquare,
	ListChecks,
	Check,
	Link,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { WorkflowStage } from "@/services/workflow-stage.service";
import { SYSTEM_STAGES } from "./system-stages";
import { StageChip } from "./StageChip";
import {
	type ApiTaskStatus,
	type UpdateTaskPayload,
} from "@/services/task.service";
import { type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { type UiTask, STATUS_BADGE } from "./types";
import { TaskAttachments } from "./TaskAttachments";
import { TaskComments } from "./TaskComments";
import {
	InlineTitle,
	InlineDescription,
	InlinePriority,
	InlineTaskType,
	InlineAssignee,
	InlineDueDate,
	InlineEstimatedTime,
	InlineTags,
	InlineSprint,
} from "./task-detail";
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

interface Props {
	task: UiTask | null;
	projects: Project[];
	profiles?: Profile[];
	allTasks?: UiTask[];
	stages?: WorkflowStage[];
	onClose: () => void;
	onSaveNotes?: (task: UiTask, notes: string) => Promise<void>;
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
	stages,
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
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
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

	useEffect(() => {
		if (!task) return;
		let active = true;
		setSprintsLoading(true);
		listSprints()
			.then((data) => {
				if (active) setSprints(data);
			})
			.catch(() => {
				if (active) setSprints([]);
			})
			.finally(() => {
				if (active) setSprintsLoading(false);
			});
		return () => {
			active = false;
		};
	}, [task?.project_id]);

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
			if (onSaveNotes) {
				await onSaveNotes(task, notes);
			}
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
		const url = `${window.location.origin}/tasks?taskId=${task.id}&projectId=${task.project_id}`;
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
									<InlineTaskType
										value={task.task_type}
										canEdit={canEdit}
										onSave={(id) =>
											persist({ task_type_id: id })
										}
									/>
									<InlinePriority
										value={task.priority}
										canEdit={canEdit}
										onSave={(p) => persist({ priority: p })}
									/>
									<span className="text-sm text-muted">
										/
									</span>
									<span
										className="text-sm font-medium text-primary truncate cursor-pointer flex items-center hover:text-primary-hover gap-2"
										onClick={handleCopyLink}
										title="Click to copy task link"
									>
										{shortTaskRef(task, project)}
										<span>
											<Link className="h-4 w-4" />
										</span>
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
										className="text-foreground hidden!"
										onClick={() => onEdit(task)}
									>
										<Pencil className="h-3.5 w-3.5" />
										<span className="text-[12px]">
											Edit
										</span>
									</Button>
								</PermissionGate>
							)}
							{task && onDelete && (
								<PermissionGate feature="Create & edit tasks">
									<Button
										variant="destructive_outline"
										size="sm"
										className="text-foreground hover:text-danger"
										onClick={() =>
											setConfirmingDelete(true)
										}
									>
										<Trash2 className="h-3.5 w-3.5" />
										<span className="text-[12px]">
											Delete
										</span>
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
										onSave={(v) =>
											persist({ description: v })
										}
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
													onClick={() =>
														onAddChild(task)
													}
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
											const done =
												child.apiStatus === "done";
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
													onClick={() =>
														onAddChild(task)
													}
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

							{/* Attachments */}
							{task && (
								<section>
									<div className="flex items-center gap-2 mb-3">
										<Paperclip className="h-4 w-4 text-muted" />
										<h3 className="text-sm font-semibold text-foreground">
											Attachments
										</h3>
									</div>
									<TaskAttachments
										projectId={task.project_id}
										taskId={task.id}
										canEdit={canEdit}
									/>
								</section>
							)}

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
										{onSaveNotes && (
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
										)}
									</>
								) : projectDescriptionText(notes) ? (
									<div className="text-sm text-foreground bg-muted-subtle/40 rounded-lg p-3">
										<ProjectDescriptionPreview
											value={notes}
										/>
									</div>
								) : (
									<p className="text-xs text-muted italic">
										No notes yet.
									</p>
								)}
							</section>

							{/* Comments */}
							{task && (
								<section>
									<div className="flex items-center gap-2 mb-3">
										<MessagesSquare className="h-4 w-4 text-muted" />
										<h3 className="text-sm font-semibold text-foreground">
											Comments
										</h3>
									</div>
									<TaskComments
										projectId={task.project_id}
										taskId={task.id}
									/>
								</section>
							)}
						</div>

						{/* Sidebar */}
						<aside className="border-l border-border bg-muted-subtle/30 overflow-y-auto px-5 py-6 space-y-5 max-h-[80vh]">
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
												{(stages ?? SYSTEM_STAGES).map(
													(stage) => (
														<SelectItem
															key={stage.key}
															value={stage.key}
														>
															<StageChip
																label={stage.name}
																color={stage.color}
															/>
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										{statusSaving && (
											<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
										)}
									</div>
								) : (
									<Badge
										variant={
											STATUS_BADGE[
												task?.apiStatus ?? "todo"
											].variant
										}
									>
										{
											STATUS_BADGE[
												task?.apiStatus ?? "todo"
											].label
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
										onSave={(v) =>
											persist({ assigned_to: v })
										}
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
									{task && (
										<InlineSprint
											sprint={task.sprint}
											sprints={sprints}
											loading={sprintsLoading}
											canEdit={canEdit}
											onSave={(v) =>
												persist({ sprint_id: v })
											}
										/>
									)}
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
								<Link2 className="h-4 w-4 mr-2  text-primary" />
								<span className=" text-primary text-xs!">
									Copy Task Link
								</span>
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
