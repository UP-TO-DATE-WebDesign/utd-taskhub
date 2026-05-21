import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogClose,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import {
	type ApiTaskPriority,
	type CreateTaskPayload,
	type UpdateTaskPayload,
} from "@/services/task.service";
import { type Project } from "@/services/project.service";
import { type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { getTeamSprintCapacity } from "@/services/capacity.service";
import { type SprintCapacitySummary } from "@/types/capacity";
import { cn } from "@/lib/utils";
import { EstimatedTimeField } from "./TaskForm";
import {
	type ColumnId,
	type UiTask,
	AVATAR_COLORS,
	columnIdToApiStatus,
	getInitials,
} from "./types";

const NO_SPRINT_VALUE = "__no_sprint__";

const EMPTY_FORM = {
	title: "",
	description: "",
	projectId: "",
	sprintId: "",
	assigneeId: "",
	status: "todo" as ColumnId,
	priority: "medium" as ApiTaskPriority,
	dueDate: "",
	tagInput: "",
	tags: [] as string[],
};

type FormState = typeof EMPTY_FORM;

function taskToForm(task: UiTask): FormState {
	return {
		title: task.title,
		description: task.description ?? "",
		projectId: task.project_id,
		sprintId: task.sprint?.id ?? "",
		assigneeId: task.assigned_to?.id ?? "",
		status: task.columnId,
		priority: task.priority,
		dueDate: task.due_date ? task.due_date.slice(0, 10) : "",
		tagInput: "",
		tags: [...task.tags],
	};
}

export type TaskFormSubmit =
	| {
			mode: "create";
			projectId: string;
			payload: CreateTaskPayload;
	  }
	| {
			mode: "edit";
			task: UiTask;
			payload: UpdateTaskPayload;
	  };

interface Props {
	mode: "create" | "edit";
	open: boolean;
	onClose: () => void;
	onSubmit: (out: TaskFormSubmit) => Promise<void>;
	projects: Project[];
	profiles: Profile[];
	task?: UiTask | null;
	parentTaskId?: string;
	lockedProjectId?: string;
	title?: string;
	submitLabel?: string;
}

export function TaskFormDialogV2({
	mode,
	open,
	onClose,
	onSubmit,
	projects,
	profiles,
	task,
	parentTaskId,
	lockedProjectId,
	title,
	submitLabel,
}: Props) {
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [errors, setErrors] = useState<{
		title?: string;
		projectId?: string;
	}>({});
	const [submitting, setSubmitting] = useState(false);
	const [estimatedTime, setEstimatedTime] = useState(0);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
	const [capacityMap, setCapacityMap] = useState<
		Map<string, SprintCapacitySummary>
	>(new Map());

	// Reset / hydrate when opening
	useEffect(() => {
		if (!open) return;
		if (mode === "edit" && task) {
			setForm(taskToForm(task));
			setEstimatedTime(task.estimated_time ?? 0);
		} else {
			setForm({
				...EMPTY_FORM,
				projectId: lockedProjectId ?? "",
			});
			setEstimatedTime(0);
		}
		setErrors({});
	}, [open, mode, task, lockedProjectId]);

	// Load sprints + capacity when dialog open
	useEffect(() => {
		if (!open) return;
		let active = true;
		setSprintsLoading(true);
		listSprints()
			.then((data) => {
				if (!active) return;
				setSprints(data);
				if (mode === "create") {
					const activeSprint = data.find((s) => s.status === "active");
					if (activeSprint) {
						setForm((prev) =>
							prev.sprintId ? prev : { ...prev, sprintId: activeSprint.id },
						);
					}
				} else if (mode === "edit" && task && !task.sprint) {
					const activeSprint = data.find((s) => s.status === "active");
					if (activeSprint) {
						setForm((prev) => ({ ...prev, sprintId: activeSprint.id }));
					}
				}
			})
			.catch(() => {
				if (active) setSprints([]);
			})
			.finally(() => {
				if (active) setSprintsLoading(false);
			});

		getTeamSprintCapacity()
			.then((summaries) => {
				if (!active) return;
				setCapacityMap(new Map(summaries.map((s) => [s.userId, s])));
			})
			.catch(() => {});

		return () => {
			active = false;
		};
	}, [open, mode, task]);

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (key === "title" || key === "projectId")
			setErrors((e) => ({ ...e, [key]: undefined }));
	}

	function addTag() {
		const tag = form.tagInput.trim();
		if (!tag || form.tags.includes(tag)) {
			set("tagInput", "");
			return;
		}
		set("tags", [...form.tags, tag]);
		set("tagInput", "");
	}

	function removeTag(tag: string) {
		set(
			"tags",
			form.tags.filter((t) => t !== tag),
		);
	}

	function validate() {
		const e: typeof errors = {};
		if (!form.title.trim()) e.title = "Task title is required.";
		if (!form.projectId) e.projectId = "Please select a project.";
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;
		setSubmitting(true);
		try {
			const desc = projectDescriptionText(form.description)
				? form.description
				: undefined;

			if (mode === "create") {
				const payload: CreateTaskPayload = {
					title: form.title.trim(),
					description: desc,
					status: columnIdToApiStatus(form.status),
					priority: form.priority,
					assigned_to: form.assigneeId || undefined,
					due_date: form.dueDate || undefined,
					tags: form.tags,
					project_id: form.projectId,
					sprint_id: form.sprintId || undefined,
					estimated_time: estimatedTime > 0 ? estimatedTime : 0,
					parent_task_id: parentTaskId || undefined,
				};
				await onSubmit({ mode: "create", projectId: form.projectId, payload });
			} else if (task) {
				const payload: UpdateTaskPayload = {
					title: form.title.trim(),
					description: desc ?? "",
					status: columnIdToApiStatus(form.status),
					priority: form.priority,
					assigned_to: form.assigneeId || undefined,
					due_date: form.dueDate || undefined,
					project_id: form.projectId,
					sprint_id: form.sprintId || undefined,
					tags: form.tags,
					estimated_time: estimatedTime,
				};
				await onSubmit({ mode: "edit", task, payload });
			}
			onClose();
		} catch {
			// caller is expected to toast errors; keep dialog open
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (submitting) return;
		if (!isOpen) onClose();
	}

	const headerTitle =
		title ??
		(mode === "create"
			? parentTaskId
				? "New Child Task"
				: "New Task"
			: "Edit Task");

	const ctaLabel =
		submitLabel ?? (mode === "create" ? "Create Task" : "Save Changes");

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-5xl p-0 overflow-hidden">
				{/* Top bar */}
				<div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
					<div className="flex items-center gap-3 min-w-0">
						<DialogClose className="rounded-md p-1 text-danger hover:text-foreground hover:bg-muted-subtle">
							<span className="sr-only">Close</span>
						</DialogClose>
						<span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-2 py-1 rounded">
							{mode === "create" ? "New" : "Editing"}
						</span>
						<span className="text-sm font-semibold text-foreground truncate">
							{headerTitle}
						</span>
					</div>
					<div className="flex items-center gap-2 shrink-0 pr-8">
						<Button
							variant="outline"
							size="sm"
							disabled={submitting}
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button size="sm" onClick={handleSubmit} disabled={submitting}>
							{submitting && (
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
							)}
							{ctaLabel}
						</Button>
					</div>
				</div>

				{/* Body */}
				<div className="grid grid-cols-1 md:grid-cols-[1fr_320px] max-h-[80vh] overflow-hidden">
					{/* Main column */}
					<div className="overflow-y-auto px-6 py-6 space-y-5">
						<div>
							<label className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5 block">
								Title <span className="text-danger">*</span>
							</label>
							<Input
								placeholder="e.g. Refactor authentication middleware"
								value={form.title}
								onChange={(e) => set("title", e.target.value)}
								className={cn(
									"text-base font-medium h-11",
									errors.title ? "border-danger focus:ring-danger" : "",
								)}
							/>
							{errors.title && (
								<p className="text-xs text-danger mt-1">{errors.title}</p>
							)}
						</div>

						<div>
							<label className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5 block">
								Description
							</label>
							<ProjectDescriptionEditor
								value={form.description}
								onChange={(value) => set("description", value)}
								placeholder="Describe the task details, paste screenshots, add code..."
							/>
						</div>

						<div>
							<label className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5 block">
								Tags
							</label>
							<div className="flex gap-2">
								<Input
									placeholder="Add tag..."
									value={form.tagInput}
									onChange={(e) => set("tagInput", e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addTag();
										}
									}}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addTag}
									className="shrink-0"
								>
									Add
								</Button>
							</div>
							{form.tags.length > 0 && (
								<div className="flex flex-wrap gap-1.5 mt-2">
									{form.tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
										>
											{tag}
											<button
												type="button"
												onClick={() => removeTag(tag)}
												className="text-primary/70 hover:text-primary transition-colors"
											>
												<X className="h-2.5 w-2.5" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<aside className="border-l border-border bg-muted-subtle/30 overflow-y-auto px-5 py-6 space-y-5">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
								Project <span className="text-danger">*</span>
							</p>
							<Select
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
								disabled={!!lockedProjectId}
							>
								<SelectTrigger
									className={cn(
										"h-9 text-xs",
										errors.projectId ? "border-danger" : "",
									)}
								>
									<SelectValue placeholder="Select project" />
								</SelectTrigger>
								<SelectContent>
									{projects.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.projectId && (
								<p className="text-xs text-danger mt-1">
									{errors.projectId}
								</p>
							)}
						</div>

						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
								Sprint
							</p>
							<Select
								value={form.sprintId || NO_SPRINT_VALUE}
								onValueChange={(v) =>
									set("sprintId", v === NO_SPRINT_VALUE ? "" : v)
								}
								disabled={sprintsLoading}
							>
								<SelectTrigger className="h-9 text-xs">
									<SelectValue
										placeholder={
											sprintsLoading ? "Loading..." : "Select sprint"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_SPRINT_VALUE}>No sprint</SelectItem>
									{sprints.map((sprint) => (
										<SelectItem key={sprint.id} value={sprint.id}>
											{sprint.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Separator />

						<div className="grid grid-cols-2 gap-3">
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
									Status
								</p>
								<Select
									value={form.status}
									onValueChange={(v) => set("status", v as ColumnId)}
								>
									<SelectTrigger className="h-9 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="backlog">Backlog</SelectItem>
										<SelectItem value="todo">To Do</SelectItem>
										<SelectItem value="in-progress">In Progress</SelectItem>
										<SelectItem value="qa">QA</SelectItem>
										<SelectItem value="done">Done</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
									Priority
								</p>
								<Select
									value={form.priority}
									onValueChange={(v) =>
										set("priority", v as ApiTaskPriority)
									}
								>
									<SelectTrigger className="h-9 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="urgent">Urgent</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="low">Low</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
								Due Date
							</p>
							<Input
								type="date"
								value={form.dueDate}
								onChange={(e) => set("dueDate", e.target.value)}
								className="h-9 text-xs"
							/>
						</div>

						<div>
							<EstimatedTimeField
								value={estimatedTime}
								onChange={(v) => setEstimatedTime(v)}
							/>
						</div>

						<Separator />

						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
								Assignee
							</p>
							<div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
								{profiles.map((profile, idx) => {
									const selected = form.assigneeId === profile.id;
									const cap = capacityMap.get(profile.id);
									const pct =
										cap && cap.capacityHours > 0
											? Math.min(
													Math.round(
														(cap.assignedHours / cap.capacityHours) *
															100,
													),
													100,
												)
											: null;
									return (
										<button
											key={profile.id}
											type="button"
											onClick={() =>
												set("assigneeId", selected ? "" : profile.id)
											}
											className={cn(
												"flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-left transition-colors",
												selected
													? "border-primary bg-primary/10"
													: "border-transparent hover:bg-muted-subtle",
											)}
										>
											<Avatar className="h-7 w-7 shrink-0">
												<AvatarFallback
													className={`text-[10px] text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
												>
													{getInitials(
														profile.full_name ?? profile.email,
													)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground truncate">
													{profile.full_name ?? profile.email}
												</p>
												{pct !== null && cap && (
													<div className="mt-0.5 flex items-center gap-1">
														<div className="h-1 flex-1 rounded-full bg-muted/50 overflow-hidden">
															<div
																className={cn(
																	"h-full rounded-full transition-all",
																	cap.isOverbooked
																		? "bg-danger"
																		: "bg-primary",
																)}
																style={{ width: `${pct}%` }}
															/>
														</div>
														<span className="text-[9px] text-muted">
															{cap.assignedHours}h/{cap.capacityHours}h
														</span>
													</div>
												)}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}
