import { useState, useEffect } from "react";
import {
	Loader2,
	Paperclip,
	MessageSquare,
	MessagesSquare,
	ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	type CreateTaskPayload,
	type ApiTaskStatus,
	type ApiTaskPriority,
} from "@/services/task.service";
import { type Project } from "@/services/project.service";
import { type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { listTaskTypes, type TaskType } from "@/services/task-type.service";
import { Icon, type IconName } from "@/components/ui/icon-picker";
import type { WorkflowStage } from "@/services/workflow-stage.service";
import { SYSTEM_STAGES } from "./system-stages";
import { StageChip, StageDot } from "./StageChip";
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
	open: boolean;
	onClose: () => void;
	onCreate: (projectId: string, payload: CreateTaskPayload) => Promise<void>;
	projects: Project[];
	profiles: Profile[];
	parentTaskId?: string;
	lockedProjectId?: string;
	stages?: WorkflowStage[];
	filterProject?: string;
}

export function NewTaskDialogV2({
	open,
	onClose,
	onCreate,
	projects,
	profiles,
	parentTaskId,
	lockedProjectId,
	stages,
	filterProject,
}: Props) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<ApiTaskPriority>("medium");
	const [status, setStatus] = useState<ApiTaskStatus>("todo");
	const [projectId, setProjectId] = useState<string>(
		filterProject ?? lockedProjectId ?? projects[0]?.id ?? "",
	);
	const [sprintId, setSprintId] = useState<string | null>(null);
	const [assigneeId, setAssigneeId] = useState<string | null>(null);
	const [dueDate, setDueDate] = useState<string | null>(null);
	const [estimatedTime, setEstimatedTime] = useState<number>(0);
	const [tags, setTags] = useState<string[]>([]);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
	const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
	const [taskTypeId, setTaskTypeId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTitle("");
		setDescription("");
		setPriority("medium");
		setStatus("todo");
		setProjectId(filterProject ?? lockedProjectId ?? projects[0]?.id ?? "");
		setSprintId(null);
		setAssigneeId(null);
		setDueDate(null);
		setEstimatedTime(0);
		setTags([]);
		setSubmitting(false);
	}, [open, lockedProjectId, filterProject, projects]);

	useEffect(() => {
		if (!open) return;
		let active = true;
		listTaskTypes()
			.then((data) => {
				if (!active) return;
				setTaskTypes(data);
				const def = data.find((t) => t.is_default) ?? data[0] ?? null;
				setTaskTypeId(def?.id ?? null);
			})
			.catch(() => {
				if (active) setTaskTypes([]);
			});
		return () => {
			active = false;
		};
	}, [open]);

	useEffect(() => {
		if (!open || !projectId) {
			setSprints([]);
			return;
		}
		let active = true;
		setSprintsLoading(true);
		listSprints()
			.then((data) => {
				if (!active) return;
				setSprints(data);
				const activeSprint = data.find((s) => s.status === "active");
				if (activeSprint) setSprintId(activeSprint.id);
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

	async function handleCreate() {
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}
		if (!projectId) {
			toast.error("Project is required");
			return;
		}
		const payload: CreateTaskPayload = {
			title: title.trim(),
			description: description || undefined,
			status,
			priority,
			assigned_to: assigneeId ?? undefined,
			due_date: dueDate ?? undefined,
			tags: tags.length ? tags : undefined,
			project_id: projectId == "all" ? "" : projectId,
			sprint_id: sprintId ?? undefined,
			estimated_time: estimatedTime || undefined,
			parent_task_id: parentTaskId,
			task_type_id: taskTypeId ?? undefined,
		};
		setSubmitting(true);
		try {
			await onCreate(projectId, payload);
			onClose();
		} catch (e) {
			toast.error("Failed to create task", {
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
							NEW TASK
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
									Subtasks can be added after the task is
									created
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
									Attachments can be added after the task is
									created
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
								Notes can be added after the task is created.
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
								Comments can be added after the task is created.
							</p>
						</section>
					</div>

					{/* Sidebar */}
					<aside className="border-l border-border bg-muted-subtle/30 overflow-y-auto px-5 py-6 space-y-5 max-h-[80vh]">
						{/* Task Type */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Task Type
							</p>
							<SearchableSelect<{ color: string; icon: string }>
								value={taskTypeId ?? ""}
								onValueChange={(v) => setTaskTypeId(v || null)}
								disabled={taskTypes.length === 0}
								size="sm"
								placeholder="Select type"
								options={taskTypes.map((t) => ({
									value: t.id,
									label: t.name,
									meta: { color: t.color, icon: t.icon },
								}))}
								renderOption={(opt) => (
									<span className="inline-flex items-center gap-2">
										<span
											className="inline-flex h-4 w-4 items-center justify-center rounded text-white"
											style={{
												background: opt.meta?.color,
											}}
										>
											<Icon
												name={
													opt.meta?.icon as IconName
												}
												className="h-2.5 w-2.5"
											/>
										</span>
										<span className="text-base">
											{opt.label}
										</span>
									</span>
								)}
								renderValue={(opt) => (
									<span className="inline-flex items-center gap-2">
										<span
											className="inline-flex h-4 w-4 items-center justify-center rounded text-white"
											style={{
												background: opt.meta?.color,
											}}
										>
											<Icon
												name={
													opt.meta?.icon as IconName
												}
												className="h-2.5 w-2.5"
											/>
										</span>
										{opt.label}
									</span>
								)}
							/>
						</div>

						<Separator />

						{/* Status */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Status
							</p>
							{(() => {
								const stageList = stages ?? SYSTEM_STAGES;
								return (
									<SearchableSelect<{ color: string }>
										value={status}
										onValueChange={(v) =>
											setStatus(v as ApiTaskStatus)
										}
										size="sm"
										placeholder="Select status"
										options={stageList.map((stage) => ({
											value: stage.key,
											label: stage.name,
											meta: { color: stage.color },
										}))}
										renderOption={(opt) => (
											<StageChip
												label={opt.label}
												color={opt.meta?.color ?? ""}
											/>
										)}
										renderValue={(opt) => (
											<span
												className="inline-flex items-center gap-2 font-medium"
												style={{
													color: opt.meta?.color,
												}}
											>
												<StageDot
													color={
														opt.meta?.color ?? ""
													}
												/>
												{opt.label}
											</span>
										)}
									/>
								);
							})()}
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
									locked={!!lockedProjectId}
									onSave={async (v) => {
										setProjectId(v == "all" ? "" : v);
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
								onClick={handleCreate}
								disabled={submitting}
								className="w-full"
							>
								{submitting && (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								)}
								Create Task
							</Button>
							<Button
								variant="outline"
								onClick={onClose}
								disabled={submitting}
								className="w-full"
							>
								Cancel
							</Button>
							{parentTaskId && (
								<Badge variant="todo" className="self-center">
									Subtask
								</Badge>
							)}
						</div>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}
