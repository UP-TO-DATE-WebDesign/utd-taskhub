import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listSprints, type Sprint } from "@/services/sprint.service";
import {
	createTask,
	type Task,
	type ApiTaskStatus,
	type ApiTaskPriority,
} from "@/services/task.service";
import type { Project } from "@/services/project.service";
import {
	ProjectDescriptionEditor,
} from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { cn } from "@/lib/utils";
import { AVATAR_COLORS, getInitials } from "./utils";

const TASK_EMPTY = {
	title: "",
	description: "",
	sprintId: "",
	status: "todo" as ApiTaskStatus,
	priority: "medium" as ApiTaskPriority,
	assignedTo: "",
	dueDate: "",
	tagInput: "",
	tags: [] as string[],
};

const NO_TASK_SPRINT_VALUE = "__no_task_sprint__";

export function NewTaskDialog({
	open,
	onClose,
	projectId,
	members,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	projectId: string;
	members: Project["project_members"];
	onCreated: (task: Task) => void;
}) {
	const [form, setForm] = useState(TASK_EMPTY);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintsLoading, setSprintsLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<{ title?: string; submit?: string }>(
		{},
	);
	const [estimatedTime, setEstimatedTime] = useState(0);

	const addEstimatedTime = useCallback((minutes: number) => {
		setEstimatedTime((prev) => prev + minutes);
	}, []);

	const resetEstimatedTime = useCallback(() => {
		setEstimatedTime(0);
	}, []);

	const formatTime = (minutes: number) => {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
		return `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes} min`;
	};

	useEffect(() => {
		if (!open) return;

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
	}, [open]);

	function set<K extends keyof typeof TASK_EMPTY>(
		key: K,
		value: (typeof TASK_EMPTY)[K],
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (key === "title")
			setErrors((prev) => ({ ...prev, title: undefined }));
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

	async function handleSubmit() {
		if (!form.title.trim()) {
			setErrors({ title: "Task title is required." });
			return;
		}
		setSubmitting(true);
		setErrors({});
		try {
			const task = await createTask(projectId, {
				title: form.title.trim(),
				description: projectDescriptionText(form.description)
					? form.description
					: undefined,
				status: form.status,
				priority: form.priority,
				assigned_to: form.assignedTo || undefined,
				due_date: form.dueDate || undefined,
				sprint_id: form.sprintId || undefined,
				estimated_time: estimatedTime > 0 ? estimatedTime : 0,
				tags: form.tags,
			});
			onCreated(task);
			setForm(TASK_EMPTY);
			setEstimatedTime(0);
			onClose();
		} catch {
			setErrors({ submit: "Failed to create task. Please try again." });
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			setForm(TASK_EMPTY);
			setEstimatedTime(0);
			setErrors({});
		}
		if (!isOpen) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[520px]">
				<DialogHeader>
					<DialogTitle>New Task</DialogTitle>
					<DialogDescription>
						Add a task to this project.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Sprint */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Select Sprint
						</label>
						<Select
							value={form.sprintId || NO_TASK_SPRINT_VALUE}
							onValueChange={(v) =>
								set(
									"sprintId",
									v === NO_TASK_SPRINT_VALUE ? "" : v,
								)
							}
							disabled={sprintsLoading}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										sprintsLoading
											? "Loading..."
											: "Select sprint"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_TASK_SPRINT_VALUE}>
									No sprint
								</SelectItem>
								{sprints.map((sprint) => (
									<SelectItem
										key={sprint.id}
										value={sprint.id}
									>
										{sprint.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Title */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Title <span className="text-danger">*</span>
						</label>
						<Input
							placeholder="e.g. Set up CI/CD pipeline"
							value={form.title}
							onChange={(e) => set("title", e.target.value)}
							className={errors.title ? "border-danger" : ""}
						/>
						{errors.title && (
							<p className="text-xs text-danger mt-1">
								{errors.title}
							</p>
						)}
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

					{/* Priority + Status */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Priority
							</label>
							<Select
								value={form.priority}
								onValueChange={(v) =>
									set("priority", v as ApiTaskPriority)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">
										Medium
									</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="urgent">
										Urgent
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<Select
								value={form.status}
								onValueChange={(v) =>
									set("status", v as ApiTaskStatus)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="backlog">
										Backlog
									</SelectItem>
									<SelectItem value="todo">Todo</SelectItem>
									<SelectItem value="in-progress">
										In Progress
									</SelectItem>
									<SelectItem value="qa">
										QA
									</SelectItem>
									<SelectItem value="done">Done</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Estimated Time */}
					<div className="flex flex-col items-center justify-center">
						<label className="text-sm font-medium text-muted-foreground block w-full text-left mb-1.5">
							Estimated time
						</label>
						<div className="bg-white border border-border rounded-xl px-4 py-1.5 mb-3 w-full text-center">
							<b className="text-primary text-lg">
								{formatTime(estimatedTime)}
							</b>
						</div>
						<div className="flex items-center gap-2">
							<span
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => addEstimatedTime(5)}
							>
								+5 mins
							</span>
							<span
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => addEstimatedTime(15)}
							>
								+15 mins
							</span>
							<span
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => addEstimatedTime(30)}
							>
								+30 mins
							</span>
							<span
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => addEstimatedTime(60)}
							>
								+1 hour
							</span>
							<span
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => addEstimatedTime(60 * 8)}
							>
								+8 hour
							</span>
							<span
								className="text-xs text-accent cursor-pointer shadow-xs border border-reset px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => resetEstimatedTime()}
							>
								Reset
							</span>
						</div>
					</div>

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
						<div className="flex flex-wrap gap-2">
							{members.map((m, idx) => (
								<button
									key={m.user_id}
									type="button"
									onClick={() =>
										set(
											"assignedTo",
											form.assignedTo === m.user_id
												? ""
												: m.user_id,
										)
									}
									className={cn(
										"flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
										form.assignedTo === m.user_id
											? "border-primary bg-primary-subtle text-primary font-medium"
											: "border-border hover:bg-muted-subtle text-foreground",
									)}
								>
									<Avatar className="h-5 w-5 shrink-0">
										<AvatarFallback
											className={`text-[9px] text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
										>
											{getInitials(
												m.profiles?.full_name ?? null,
											)}
										</AvatarFallback>
									</Avatar>
									{m.profiles?.full_name ?? m.user_id}
								</button>
							))}
						</div>
						{form.assignedTo && (
							<p className="text-xs text-muted mt-2">
								Assigned to{" "}
								<span className="font-medium text-foreground">
									{members.find(
										(m) => m.user_id === form.assignedTo,
									)?.profiles?.full_name ?? form.assignedTo}
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

					{errors.submit && (
						<p className="text-xs text-danger">{errors.submit}</p>
					)}
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
						Create Task
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
