import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import {
	ProjectDescriptionEditor,
	ProjectDescriptionPreview,
} from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermission } from "@/hooks/usePermission";
import { type Project } from "@/services/project.service";
import { type ApiTaskStatus } from "@/services/task.service";
import { toast } from "sonner";
import {
	type UiTask,
	STATUS_BADGE,
	formatTime,
	getInitials,
	profileColorClass,
} from "./types";

const STATUS_OPTIONS: ApiTaskStatus[] = [
	"backlog",
	"todo",
	"in_progress",
	"review",
	"done",
	"cancelled",
];

export function TaskDetailDialog({
	task,
	projects,
	allTasks = [],
	onClose,
	onSaveNotes,
	onChangeStatus,
	onAddChild,
	onOpenTask,
}: {
	task: UiTask | null;
	projects: Project[];
	allTasks?: UiTask[];
	onClose: () => void;
	onSaveNotes: (task: UiTask, notes: string) => Promise<void>;
	onChangeStatus?: (task: UiTask, status: ApiTaskStatus) => Promise<void>;
	onAddChild?: (parent: UiTask) => void;
	onOpenTask?: (task: UiTask) => void;
}) {
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [statusSaving, setStatusSaving] = useState(false);
	const { can } = usePermission();
	const canEditStatus = !!onChangeStatus && can("Create & edit tasks");

	useEffect(() => {
		if (task) setNotes(task.developer_notes ?? "");
	}, [task]);

	const project = projects.find((p) => p.id === task?.project_id);
	const assignee = task?.assigned_to;

	const children = useMemo(
		() =>
			task ? allTasks.filter((t) => t.parent_task_id === task.id) : [],
		[allTasks, task],
	);

	async function handleSave() {
		if (!task) return;
		setSaving(true);
		try {
			await onSaveNotes(task, notes);
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

	return (
		<Dialog
			open={!!task}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="text-lg font-bold text-primary leading-snug pr-6">
						{task?.title}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-5">
					{/* Status + Priority */}
					<div className="flex items-center gap-2">
						<Badge variant={task?.priority ?? "medium"}>
							{task?.priority &&
								task.priority.charAt(0).toUpperCase() +
									task.priority.slice(1)}
						</Badge>
					</div>

					{/* Meta grid */}
					<div className="grid grid-cols-2 gap-x-8 gap-y-4">
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Project
							</p>
							<p className="text-sm text-foreground font-bold">
								{project?.name ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Sprint
							</p>
							<p className="text-sm text-foreground font-bold">
								{task?.sprint?.name ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Assignee
							</p>
							{assignee ? (
								<div className="flex items-center gap-1.5">
									<Avatar className="h-5 w-5">
										<AvatarFallback
											className={`text-[9px] text-white ${profileColorClass(assignee.id)}`}
										>
											{getInitials(
												assignee.full_name ??
													assignee.email,
											)}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm font-bold text-primary">
										{assignee.full_name ?? assignee.email}
									</span>
								</div>
							) : (
								<p className="text-sm text-muted">Unassigned</p>
							)}
						</div>
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Status
							</p>
							<div className="relative">
								{canEditStatus && task ? (
									<div className="w-[150px]">
										<SearchableSelect
											value={task.apiStatus}
											onValueChange={handleStatusChange}
											disabled={statusSaving}
											size="sm"
											options={STATUS_OPTIONS.map((s) => ({
												value: s,
												label: STATUS_BADGE[s].label,
											}))}
										/>
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
								<div className=" absolute top-00">
									{statusSaving && (
										<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
									)}
								</div>
							</div>
						</div>
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Due Date
							</p>
							<p className="text-sm text-foreground">
								{task?.due_date
									? task.due_date.slice(0, 10)
									: "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
								Estimated Time
							</p>
							<p className="text-sm text-foreground font-bold">
								{task?.estimated_time
									? formatTime(task.estimated_time)
									: "—"}
							</p>
						</div>
					</div>

					{/* Tags */}
					{task && task.tags.length > 0 && (
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
								Tags
							</p>
							<div className="flex flex-wrap gap-1.5">
								{task.tags.map((tag) => (
									<span
										key={tag}
										className="text-[11px] bg-muted-subtle text-muted-foreground px-2 py-0.5 rounded-full font-medium"
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Description */}
					{task?.description &&
						projectDescriptionText(task.description) && (
							<div>
								<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
									Description
								</p>
								<div className="text-sm text-black bg-slate-100 p-2 rounded">
									<ProjectDescriptionPreview
										value={task.description}
									/>
								</div>
							</div>
						)}

					{/* Child tasks */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
								Child tasks ({children.length})
							</p>
							{task && onAddChild && (
								<PermissionGate feature="Create & edit tasks">
									<Button
										variant="primary_outline"
										size="sm"
										className="!text-xs h-7"
										onClick={() => onAddChild(task)}
									>
										<Plus className="h-3 w-3" />
										Add child
									</Button>
								</PermissionGate>
							)}
						</div>
						{children.length === 0 ? (
							<p className="text-xs text-muted">
								No child tasks yet.
							</p>
						) : (
							<ul className="space-y-1">
								{children.map((child) => (
									<li
										key={child.id}
										className="flex items-center gap-2 px-2 py-1.5 rounded border border-border hover:bg-muted-subtle"
									>
										<Badge
											variant={
												STATUS_BADGE[child.apiStatus]
													.variant
											}
											className="text-[9px] shrink-0"
										>
											{
												STATUS_BADGE[child.apiStatus]
													.label
											}
										</Badge>
										<button
											type="button"
											onClick={() => onOpenTask?.(child)}
											className="flex-1 text-left text-sm text-foreground font-medium truncate hover:text-primary transition-colors"
										>
											{child.title}
										</button>
										<Badge
											variant={child.priority}
											className="text-[9px] shrink-0"
										>
											{child.priority
												.charAt(0)
												.toUpperCase() +
												child.priority.slice(1)}
										</Badge>
										{child.assigned_to ? (
											<Avatar className="h-5 w-5 shrink-0">
												<AvatarFallback
													className={`text-[9px] text-white ${profileColorClass(child.assigned_to.id)}`}
												>
													{getInitials(
														child.assigned_to
															.full_name ??
															child.assigned_to
																.email,
													)}
												</AvatarFallback>
											</Avatar>
										) : (
											<span className="text-[10px] text-muted shrink-0">
												—
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</div>

					{/* Developer's Notes */}
					<div>
						<label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
							Developer's Notes
						</label>
						<ProjectDescriptionEditor
							value={notes}
							onChange={setNotes}
							placeholder="Add implementation details, technical context, or notes for the dev team..."
						/>
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={saving}>
							Close
						</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={saving}>
						{saving && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Save Notes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
