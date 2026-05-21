import { useState, useEffect } from "react";
import {
	Loader2,
	Paperclip,
	MessageSquare,
	MessagesSquare,
	ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	type UpdateTaskPayload,
	type ApiTaskStatus,
	type ApiTaskPriority,
} from "@/services/task.service";
import { type Project } from "@/services/project.service";
import { type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { type UiTask } from "./types";
import type { WorkflowStage } from "@/services/workflow-stage.service";
import { SYSTEM_STAGES } from "./system-stages";
import { StageChip } from "./StageChip";
import {
	InlineTitle,
	InlineDescription,
	InlinePriority,
	InlineAssignee,
	InlineDueDate,
	InlineEstimatedTime,
	InlineTags,
	InlineSprint,
	InlineProject,
} from "./task-detail";
interface Props {
	task: UiTask | null;
	onClose: () => void;
	onSave: (task: UiTask, payload: UpdateTaskPayload) => Promise<void>;
	projects: Project[];
	profiles: Profile[];
	stages?: WorkflowStage[];
}

export function EditTaskDialogV2({
	task,
	onClose,
	onSave,
	projects,
	profiles,
	stages,
}: Props) {
	const open = !!task;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<ApiTaskPriority>("medium");
	const [status, setStatus] = useState<ApiTaskStatus>("todo");
	const [projectId, setProjectId] = useState<string>("");
	const [sprintId, setSprintId] = useState<string | null>(null);
	const [assigneeId, setAssigneeId] = useState<string | null>(null);
	const [dueDate, setDueDate] = useState<string | null>(null);
	const [estimatedTime, setEstimatedTime] = useState<number>(0);
	const [tags, setTags] = useState<string[]>([]);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!task) return;
		setTitle(task.title);
		setDescription(task.description ?? "");
		setPriority(task.priority);
		setStatus(task.apiStatus);
		setProjectId(task.project_id);
		setSprintId(task.sprint?.id ?? null);
		setAssigneeId(task.assigned_to?.id ?? null);
		setDueDate(task.due_date ?? null);
		setEstimatedTime(task.estimated_time ?? 0);
		setTags([...task.tags]);
		setSubmitting(false);
	}, [task]);

	useEffect(() => {
		if (!open || !projectId) {
			setSprints([]);
			return;
		}
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
	}, [open, projectId]);

	const assignee = assigneeId
		? (profiles.find((p) => p.id === assigneeId) ?? null)
		: null;
	const sprint = sprintId
		? (sprints.find((s) => s.id === sprintId) ?? null)
		: null;

	async function handleSave() {
		if (!task) return;
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}
		const payload: UpdateTaskPayload = {
			title: title.trim(),
			description: description || undefined,
			status,
			priority,
			assigned_to: assigneeId ?? undefined,
			due_date: dueDate ?? undefined,
			tags: tags.length ? tags : undefined,
			project_id: projectId,
			sprint_id: sprintId ?? undefined,
			estimated_time: estimatedTime || undefined,
		};
		setSubmitting(true);
		try {
			await onSave(task, payload);
			onClose();
		} catch (e) {
			toast.error("Failed to update task", {
				description: (e as Error).message || "Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-5xl p-0 overflow-hidden">
				{/* Top bar */}
				<div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
					<div className="flex items-center gap-3 min-w-0">
						<DialogClose className="rounded-md p-1 text-danger hover:text-foreground hover:bg-muted-subtle"></DialogClose>
						<InlinePriority
							value={priority}
							canEdit
							onSave={async (p) => {
								setPriority(p);
							}}
						/>
						<span className="text-sm text-muted">/</span>
						<span className="text-sm font-medium text-primary truncate">
							EDIT TASK
						</span>
					</div>
				</div>

				{/* Body */}
				<div className="grid grid-cols-1 md:grid-cols-[1fr_300px] max-h-[80vh] overflow-hidden">
					{/* Main column */}
					<div className="overflow-y-auto px-6 py-6 space-y-7 max-h-[80vh]">
						{/* Title + description */}
						<div>
							<InlineTitle
								value={title || "Untitled task"}
								canEdit
								onSave={async (v) => {
									setTitle(v);
								}}
							/>
							<InlineDescription
								value={description}
								canEdit
								onSave={async (v) => {
									setDescription(v);
								}}
							/>
						</div>

						{/* Subtasks placeholder */}
						<section>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<ListChecks className="h-4 w-4 text-muted" />
									<h3 className="text-sm font-semibold text-foreground">
										Subtasks
									</h3>
								</div>
							</div>
							<div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
								<p className="text-xs text-muted">
									Open task details to manage subtasks
								</p>
							</div>
						</section>

						{/* Attachments placeholder */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<Paperclip className="h-4 w-4 text-muted" />
								<h3 className="text-sm font-semibold text-foreground">
									Attachments
								</h3>
							</div>
							<div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
								<p className="text-xs text-muted">
									Open task details to manage attachments
								</p>
							</div>
						</section>

						{/* Developer notes placeholder */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<MessageSquare className="h-4 w-4 text-muted" />
								<h3 className="text-sm font-semibold text-foreground">
									Developer's Notes
								</h3>
							</div>
							<p className="text-xs text-muted italic">
								Open task details to manage developer notes.
							</p>
						</section>

						{/* Comments placeholder */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<MessagesSquare className="h-4 w-4 text-muted" />
								<h3 className="text-sm font-semibold text-foreground">
									Comments
								</h3>
							</div>
							<p className="text-xs text-muted italic">
								Open task details to view and add comments.
							</p>
						</section>
					</div>

					{/* Sidebar */}
					<aside className="border-l border-border bg-muted-subtle/30 overflow-y-auto px-5 py-6 space-y-5 max-h-[80vh]">
						{/* Status */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Status
							</p>
							<Select
								value={status}
								onValueChange={(v) =>
									setStatus(v as ApiTaskStatus)
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(stages ?? SYSTEM_STAGES).map((stage) => (
										<SelectItem
											key={stage.key}
											value={stage.key}
										>
											<StageChip
												label={stage.name}
												color={stage.color}
											/>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Separator />

						{/* Assignee */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Assignee
							</p>
							<InlineAssignee
								assignee={
									assignee
										? {
												id: assignee.id,
												full_name: assignee.full_name,
												email: assignee.email,
												avatar_url: assignee.avatar_url,
											}
										: null
								}
								profiles={profiles}
								canEdit
								onSave={async (v) => {
									setAssigneeId(v);
								}}
							/>
						</div>

						<Separator />

						{/* Project + Sprint */}
						<div className="space-y-3">
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
									Project
								</p>
								<InlineProject
									projectId={projectId}
									projects={projects}
									canEdit
									onSave={async (v) => {
										setProjectId(v);
										setSprintId(null);
									}}
								/>
							</div>
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
									Sprint
								</p>
								<InlineSprint
									sprint={
										sprint
											? {
													id: sprint.id,
													name: sprint.name,
													status: sprint.status,
													start_date:
														sprint.start_date,
													end_date: sprint.end_date,
												}
											: null
									}
									sprints={sprints}
									loading={sprintsLoading}
									canEdit
									onSave={async (v) => {
										setSprintId(v);
									}}
								/>
							</div>
						</div>

						<Separator />

						{/* Due date */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Due Date
							</p>
							<InlineDueDate
								value={dueDate}
								canEdit
								onSave={async (v) => {
									setDueDate(v);
								}}
							/>
						</div>

						{/* Estimation */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Estimation
							</p>
							<InlineEstimatedTime
								value={estimatedTime}
								canEdit
								onSave={async (v) => {
									setEstimatedTime(v);
								}}
							/>
						</div>

						<Separator />

						{/* Tags */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Tags
							</p>
							<InlineTags
								value={tags}
								canEdit
								onSave={async (v) => {
									setTags(v);
								}}
							/>
						</div>

						{/* Footer actions */}
						<div className="flex flex-col gap-2 pt-2">
							<Button
								onClick={handleSave}
								disabled={submitting}
								className="w-full"
							>
								{submitting && (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								)}
								Save Changes
							</Button>
							<Button
								variant="outline"
								onClick={onClose}
								disabled={submitting}
								className="w-full"
							>
								Cancel
							</Button>
						</div>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}
