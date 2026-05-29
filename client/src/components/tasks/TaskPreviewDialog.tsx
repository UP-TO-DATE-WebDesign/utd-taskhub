import { useMemo } from "react";
import {
	Link2,
	Link,
	Paperclip,
	MessageSquare,
	MessagesSquare,
	ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ProjectDescriptionPreview } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { formatDate } from "@/lib/utils";
import { type Project } from "@/services/project.service";
import { type Task } from "@/services/task.service";
import { StageDot } from "./StageChip";
import { TaskAttachments } from "./TaskAttachments";
import { TaskComments } from "./TaskComments";
import {
	getInitials,
	profileColorClass,
	formatTime,
	getStageLabel,
	getStageColor,
} from "./types";

function shortTaskRef(task: Task, project?: Project): string {
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
	task: Task | null;
	projects: Project[];
	allTasks?: Task[];
	onClose: () => void;
	onOpenTask?: (task: Task) => void;
}

export function TaskPreviewDialog({
	task,
	projects,
	allTasks = [],
	onClose,
	onOpenTask,
}: Props) {
	const project = projects.find((p) => p.id === task?.project_id);

	const children = useMemo(
		() =>
			task ? allTasks.filter((t) => t.parent_task_id === task.id) : [],
		[allTasks, task],
	);
	const completedCount = children.filter((c) => c.status === "done").length;
	const progress = children.length
		? Math.round((completedCount / children.length) * 100)
		: 0;

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

	const assignee = task?.assigned_to;

	return (
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
								<Badge variant={task.priority} className="text-[10px]">
									{task.priority.charAt(0).toUpperCase() +
										task.priority.slice(1)}
								</Badge>
								<span className="text-sm text-muted">/</span>
								<span
									className="text-sm font-medium text-primary truncate cursor-pointer flex items-center hover:text-primary-hover gap-2"
									onClick={handleCopyLink}
									title="Click to copy task link"
								>
									{shortTaskRef(task, project)}
									<Link className="h-4 w-4" />
								</span>
							</>
						)}
					</div>
					<span className="text-[10px] font-medium uppercase tracking-wider text-muted shrink-0 pr-8">
						Preview
					</span>
				</div>

				{/* Body */}
				<div className="grid grid-cols-1 md:grid-cols-[1fr_300px] max-h-[80vh] overflow-hidden">
					{/* Main column */}
					<div className="overflow-y-auto px-6 py-6 space-y-7 max-h-[80vh]">
						{/* Title + description */}
						<div>
							<h2 className="text-lg font-semibold text-foreground">
								{task?.title}
							</h2>
							<div className="mt-2 text-sm text-foreground">
								{task && projectDescriptionText(task.description) ? (
									<ProjectDescriptionPreview
										value={task.description ?? ""}
									/>
								) : (
									<p className="text-xs text-muted italic">
										No description.
									</p>
								)}
							</div>
							{task?.created_by && (
								<p className="mt-4 italic text-[10px] text-muted">
									Created by{" "}
									<span className="font-medium">
										{task.created_by.full_name ??
											task.created_by.email}
									</span>
								</p>
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
							{children.length > 0 ? (
								<>
									<div className="h-1.5 w-full rounded-full bg-muted-subtle overflow-hidden mb-3">
										<div
											className="h-full bg-primary transition-all"
											style={{ width: `${progress}%` }}
										/>
									</div>
									<div className="rounded-lg border border-border bg-muted-subtle/30 p-3 space-y-1.5">
										{children.map((child) => {
											const done = child.status === "done";
											return (
												<div
													key={child.id}
													className="flex items-center gap-2.5"
												>
													<span
														className={`h-4 w-4 rounded shrink-0 flex items-center justify-center border ${
															done
																? "bg-primary border-primary"
																: "border-border-strong bg-surface"
														}`}
													/>
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
													<span
														className="inline-flex items-center gap-1.5 text-[10px] font-medium shrink-0"
														style={{
															color: getStageColor(
																child.status,
															),
														}}
													>
														<StageDot
															color={getStageColor(
																child.status,
															)}
														/>
														{getStageLabel(child.status)}
													</span>
												</div>
											);
										})}
									</div>
								</>
							) : (
								<div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
									<p className="text-xs text-muted">No subtasks.</p>
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
									canEdit={false}
								/>
							</section>
						)}

						{/* Developer notes */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<MessageSquare className="h-4 w-4 text-muted" />
								<h3 className="text-sm font-semibold text-foreground">
									Developer's Notes
								</h3>
							</div>
							{task && projectDescriptionText(task.developer_notes) ? (
								<div className="text-sm text-foreground bg-muted-subtle/40 rounded-lg p-3">
									<ProjectDescriptionPreview
										value={task.developer_notes ?? ""}
									/>
								</div>
							) : (
								<p className="text-xs text-muted italic">No notes yet.</p>
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
							{task && (
								<span
									className="inline-flex items-center gap-2 text-xs font-medium"
									style={{ color: getStageColor(task.status) }}
								>
									<StageDot color={getStageColor(task.status)} />
									{getStageLabel(task.status)}
								</span>
							)}
						</div>

						<Separator />

						{/* Assignee */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Assignee
							</p>
							{assignee ? (
								<div className="flex items-center gap-2">
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
											{getInitials(
												assignee.full_name ?? assignee.email,
											)}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm text-foreground truncate">
										{assignee.full_name ?? assignee.email}
									</span>
								</div>
							) : (
								<p className="text-sm text-muted">Unassigned</p>
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
							<p className="text-sm text-foreground">
								{task?.due_date
									? formatDate(task.due_date.slice(0, 10))
									: "—"}
							</p>
						</div>

						{/* Estimation */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Estimation
							</p>
							<p className="text-sm text-foreground">
								{task?.estimated_time
									? formatTime(task.estimated_time)
									: "—"}
							</p>
						</div>

						<Separator />

						{/* Tags */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Tags
							</p>
							{task && task.tags.length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									{task.tags.map((tag) => (
										<span
											key={tag}
											className="text-[10px] bg-muted-subtle text-muted-foreground px-1.5 py-0.5 rounded font-medium"
										>
											{tag}
										</span>
									))}
								</div>
							) : (
								<p className="text-sm text-muted">No tags</p>
							)}
						</div>

						{/* Copy link */}
						<Button
							variant="outline"
							className="w-full justify-start"
							onClick={handleCopyLink}
						>
							<Link2 className="h-4 w-4 mr-2 text-primary" />
							<span className="text-primary text-xs!">
								Copy Task Link
							</span>
						</Button>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}
