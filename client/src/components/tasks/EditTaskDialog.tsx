import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
	type ApiTaskPriority,
	type UpdateTaskPayload,
} from "@/services/task.service";
import { type Project } from "@/services/project.service";
import { type Profile } from "@/services/profile.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { listTaskTypes, type TaskType } from "@/services/task-type.service";
import { Icon, type IconName } from "@/components/ui/icon-picker";
import { getTeamSprintCapacity } from "@/services/capacity.service";
import { type SprintCapacitySummary } from "@/types/capacity";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { cn } from "@/lib/utils";
import { EstimatedTimeField } from "./TaskForm";
import {
	type UiTask,
	type ColumnId,
	AVATAR_COLORS,
	columnIdToApiStatus,
	getInitials,
} from "./types";

const NO_SPRINT_VALUE = "__no_sprint__";

const EMPTY_EDIT_FORM = {
	title: "",
	description: "",
	projectId: "",
	assigneeId: "",
	sprintId: "",
	status: "todo" as ColumnId,
	priority: "medium" as ApiTaskPriority,
	dueDate: "",
	tagInput: "",
	tags: [] as string[],
	taskTypeId: "",
};

function taskToEditForm(task: UiTask): typeof EMPTY_EDIT_FORM {
	return {
		title: task.title,
		description: task.description ?? "",
		projectId: task.project_id,
		assigneeId: task.assigned_to?.id ?? "",
		sprintId: task.sprint?.id ?? "",
		status: task.columnId,
		priority: task.priority,
		dueDate: task.due_date ? task.due_date.slice(0, 10) : "",
		tagInput: "",
		tags: [...task.tags],
		taskTypeId: task.task_type?.id ?? task.task_type_id ?? "",
	};
}

export function EditTaskDialog({
	task,
	onClose,
	onSave,
	projects,
	profiles,
}: {
	task: UiTask | null;
	onClose: () => void;
	onSave: (task: UiTask, payload: UpdateTaskPayload) => Promise<void>;
	projects: Project[];
	profiles: Profile[];
}) {
	const [form, setForm] = useState(EMPTY_EDIT_FORM);
	const [errors, setErrors] = useState<{
		title?: string;
		projectId?: string;
	}>({});
	const [submitting, setSubmitting] = useState(false);
	const [estimatedTime, setEstimatedTime] = useState(0);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
	const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
	const [capacityMap, setCapacityMap] = useState<
		Map<string, SprintCapacitySummary>
	>(new Map());

	useEffect(() => {
		if (task) {
			setForm(taskToEditForm(task));
			setEstimatedTime(task.estimated_time ?? 0);
		} else {
			setForm(EMPTY_EDIT_FORM);
			setEstimatedTime(0);
		}
		setErrors({});
	}, [task]);

	useEffect(() => {
		if (!task) return;
		let active = true;
		setSprintsLoading(true);
		listSprints()
			.then((data) => {
				if (!active) return;
				setSprints(data);
				if (!task.sprint) {
					const activeSprint = data.find(
						(s) => s.status === "active",
					);
					if (activeSprint)
						setForm((prev) => ({
							...prev,
							sprintId: activeSprint.id,
						}));
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

		listTaskTypes()
			.then((data) => {
				if (active) setTaskTypes(data);
			})
			.catch(() => {
				if (active) setTaskTypes([]);
			});

		return () => {
			active = false;
		};
	}, [task]);

	function set<K extends keyof typeof EMPTY_EDIT_FORM>(
		key: K,
		value: (typeof EMPTY_EDIT_FORM)[K],
	) {
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
		if (!task || !validate()) return;
		setSubmitting(true);
		try {
			await onSave(task, {
				title: form.title.trim(),
				description: projectDescriptionText(form.description)
					? form.description
					: "",
				status: columnIdToApiStatus(form.status),
				priority: form.priority,
				assigned_to: form.assigneeId || undefined,
				due_date: form.dueDate || undefined,
				project_id: form.projectId,
				sprint_id: form.sprintId || undefined,
				tags: form.tags,
				estimated_time: estimatedTime,
				task_type_id: form.taskTypeId || null,
			});
			onClose();
		} catch {
			toast.error("Failed to update task", {
				description: "Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	const selectedAssignee = profiles.find((p) => p.id === form.assigneeId);

	return (
		<Dialog
			open={!!task}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Edit Task</DialogTitle>
					<DialogDescription>
						Update the task details below.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{/* Title */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Title <span className="text-danger">*</span>
						</label>
						<Input
							placeholder="e.g. Refactor authentication middleware"
							value={form.title}
							onChange={(e) => set("title", e.target.value)}
							className={
								errors.title
									? "border-danger focus:ring-danger"
									: ""
							}
						/>
						{errors.title && (
							<p className="text-xs text-danger mt-1">
								{errors.title}
							</p>
						)}
					</div>

					{/* Project + Sprint */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Project <span className="text-danger">*</span>
							</label>
							<SearchableSelect
								value={form.projectId}
								onValueChange={(v) => set("projectId", v)}
								error={!!errors.projectId}
								placeholder="Select project"
								options={projects.map<SearchableSelectOption>((p) => ({
									value: p.id,
									label: p.name,
								}))}
							/>
							{errors.projectId && (
								<p className="text-xs text-danger mt-1">
									{errors.projectId}
								</p>
							)}
						</div>

						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Sprint
							</label>
							<div className="relative">
								{sprintsLoading && (
									<>
										<div className="h-full w-full absolute rounded-2xl bg-white/20 backdrop-blur-xs top-0 left-0 pointer-events-none" />
										<div className="bg-white/50 backdrop-blur-xs h-full w-full absolute rounded-2xl text-slate-600 flex items-center px-2 text-xs justify-center z-10 border border-border pointer-events-none">
											loading...
										</div>
									</>
								)}
								<SearchableSelect
									value={form.sprintId || NO_SPRINT_VALUE}
									onValueChange={(v) =>
										set(
											"sprintId",
											v === NO_SPRINT_VALUE || !v ? "" : v,
										)
									}
									disabled={sprintsLoading}
									loading={sprintsLoading}
									placeholder={
										sprintsLoading
											? "Loading..."
											: "Select sprint"
									}
									options={[
										{ value: NO_SPRINT_VALUE, label: "No sprint" },
										...sprints.map<SearchableSelectOption>((s) => ({
											value: s.id,
											label: s.name,
										})),
									]}
								/>
							</div>
						</div>
					</div>

					{/* Description */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Description
						</label>
						<ProjectDescriptionEditor
							value={form.description}
							onChange={(value) => set("description", value)}
							placeholder="Describe the task details..."
						/>
					</div>

					{/* Task Type */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Task Type
						</label>
						<SearchableSelect<{ color: string; icon: string }>
							value={form.taskTypeId}
							onValueChange={(v) => set("taskTypeId", v)}
							disabled={taskTypes.length === 0}
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
										style={{ background: opt.meta?.color }}
									>
										<Icon
											name={opt.meta?.icon as IconName}
											className="h-2.5 w-2.5"
										/>
									</span>
									{opt.label}
								</span>
							)}
							renderValue={(opt) => (
								<span className="inline-flex items-center gap-2">
									<span
										className="inline-flex h-4 w-4 items-center justify-center rounded text-white"
										style={{ background: opt.meta?.color }}
									>
										<Icon
											name={opt.meta?.icon as IconName}
											className="h-2.5 w-2.5"
										/>
									</span>
									{opt.label}
								</span>
							)}
						/>
					</div>

					{/* Priority + Status */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Priority
							</label>
							<SearchableSelect
								value={form.priority}
								onValueChange={(v) =>
									set("priority", v as ApiTaskPriority)
								}
								options={[
									{ value: "urgent", label: "Urgent" },
									{ value: "high", label: "High" },
									{ value: "medium", label: "Medium" },
									{ value: "low", label: "Low" },
								]}
							/>
						</div>

						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<SearchableSelect
								value={form.status}
								onValueChange={(v) =>
									set("status", v as ColumnId)
								}
								options={[
									{ value: "todo", label: "To Do" },
									{ value: "in-progress", label: "In Progress" },
									{ value: "qa", label: "QA" },
									{ value: "done", label: "Done" },
								]}
							/>
						</div>
					</div>

					{/* Estimated Time */}
					<EstimatedTimeField
						value={estimatedTime}
						onChange={(v) => setEstimatedTime(v)}
					/>

					{/* Due Date */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Due date
						</label>
						<Input
							type="date"
							value={form.dueDate}
							onChange={(e) => set("dueDate", e.target.value)}
						/>
					</div>

					{/* Assignee */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-2 block">
							Assignee
						</label>

						<div className="grid grid-cols-2 gap-2">
							{profiles.map((profile, idx) => {
								const cap = capacityMap.get(profile.id);
								const consumedPct = cap
									? Math.min(
											Math.round(
												(cap.consumedHours /
													cap.capacityHours) *
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
											set(
												"assigneeId",
												form.assigneeId === profile.id
													? ""
													: profile.id,
											)
										}
										className={cn(
											"flex flex-col items-start gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors",
											form.assigneeId === profile.id
												? "border-primary bg-primary-subtle text-primary font-medium"
												: "border-border hover:bg-muted-subtle text-foreground",
										)}
									>
										<div className="flex items-center gap-2">
											<Avatar className="h-10 w-10 shrink-0">
												<AvatarFallback
													className={`text-sm text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
												>
													{getInitials(
														profile.full_name ??
															profile.email,
													)}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col items-start">
												<span className="font-bold text-primary text-sm">
													{profile.full_name}
												</span>
												<small className="text-[8px] font-light">
													{profile.email}
												</small>
											</div>
										</div>
										{cap !== undefined &&
											consumedPct !== null && (
												<div className="w-full flex flex-col gap-0.5">
													<div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
														<div
															className={cn(
																"h-full rounded-full transition-all",
																cap.isOverbooked
																	? "bg-danger"
																	: "bg-primary",
															)}
															style={{
																width: `${consumedPct}%`,
															}}
														/>
													</div>
													<span
														className={cn(
															"text-[9px]",
															cap.isOverbooked
																? "text-danger"
																: "text-muted-foreground",
														)}
													>
														{cap.consumedHours}h /{" "}
														{cap.capacityHours}h
													</span>
												</div>
											)}
									</button>
								);
							})}
						</div>
						{selectedAssignee && (
							<p className="text-base text-muted mt-2">
								Assigned to:{" "}
								<span className="font-bold text-primary">
									{selectedAssignee.full_name ??
										selectedAssignee.email}
								</span>
							</p>
						)}
					</div>

					{/* Tags */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Tags
						</label>
						<div className="flex gap-2">
							<Input
								placeholder="Add tag..."
								value={form.tagInput}
								onChange={(e) =>
									set("tagInput", e.target.value)
								}
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
										className="inline-flex items-center gap-1 text-[11px] bg-muted-subtle text-muted-foreground px-2 py-0.5 rounded-full font-medium"
									>
										{tag}
										<button
											type="button"
											onClick={() => removeTag(tag)}
											className="text-muted hover:text-foreground transition-colors"
										>
											<X className="h-2.5 w-2.5" />
										</button>
									</span>
								))}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={handleSubmit} disabled={submitting}>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
