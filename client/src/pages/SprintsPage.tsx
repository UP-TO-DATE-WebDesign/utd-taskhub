import { useState, useEffect } from "react";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { WeekPicker } from "@/components/ui/week-picker";
import {
	listSprints,
	createSprint,
	updateSprint,
	deleteSprint,
	type Sprint,
	type SprintStatus,
} from "@/services/sprint.service";
import { toast } from "sonner";
import { SprintsListSkeleton } from "@/components/sprints/SprintsListSkeleton";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
	SprintStatus,
	{ variant: "todo" | "in-progress" | "done"; label: string }
> = {
	planned: { variant: "todo", label: "Planned" },
	active: { variant: "in-progress", label: "Active" },
	completed: { variant: "done", label: "Completed" },
};

type WeekRange = { start: Date; end: Date };

const EMPTY_FORM = {
	name: "",
	week: null as WeekRange | null,
	status: "planned" as SprintStatus,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSprintRange(start: string, end: string): string {
	const s = new Date(start + "T00:00:00");
	const e = new Date(end + "T00:00:00");
	if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
		return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
	}
	return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

// ── New Sprint Dialog ─────────────────────────────────────────────────────────

function NewSprintDialog({
	open,
	onClose,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: (sprint: Sprint) => void;
}) {
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<{
		name?: string;
		week?: string;
		submit?: string;
	}>({});

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			setForm(EMPTY_FORM);
			setErrors({});
			onClose();
		}
	}

	async function handleSubmit() {
		const errs: typeof errors = {};
		if (!form.name.trim()) errs.name = "Sprint name is required.";
		if (!form.week) errs.week = "Please select a week.";
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setSubmitting(true);
		setErrors({});
		try {
			const sprint = await createSprint({
				name: form.name.trim(),
				start_date: format(form.week!.start, "yyyy-MM-dd"),
				end_date: format(form.week!.end, "yyyy-MM-dd"),
				status: form.status,
			});
			onCreated(sprint);
			setForm(EMPTY_FORM);
			onClose();
			toast.success("Sprint created", { description: sprint.name });
		} catch (err: any) {
			const msg = err?.response?.data?.message ?? "Failed to create sprint.";
			setErrors({ submit: msg });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[440px]">
				<DialogHeader>
					<DialogTitle>New Sprint</DialogTitle>
					<DialogDescription>
						Sprints cover one work week (Mon – Fri).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Sprint Name <span className="text-danger">*</span>
						</label>
						<Input
							placeholder="e.g. Sprint 1"
							value={form.name}
							onChange={(e) => {
								setForm((p) => ({ ...p, name: e.target.value }));
								setErrors((p) => ({ ...p, name: undefined }));
							}}
							className={errors.name ? "border-danger" : ""}
						/>
						{errors.name && (
							<p className="text-xs text-danger mt-1">{errors.name}</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Week <span className="text-danger">*</span>
						</label>
						<WeekPicker
							value={form.week}
							onChange={(w) => {
								setForm((p) => ({ ...p, week: w }));
								setErrors((p) => ({ ...p, week: undefined }));
							}}
							placeholder="Select a week"
						/>
						{errors.week && (
							<p className="text-xs text-danger mt-1">{errors.week}</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Status
						</label>
						<Select
							value={form.status}
							onValueChange={(v) =>
								setForm((p) => ({ ...p, status: v as SprintStatus }))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="planned">Planned</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
							</SelectContent>
						</Select>
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
						{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						Create Sprint
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Edit Sprint Dialog ────────────────────────────────────────────────────────

function EditSprintDialog({
	open,
	onClose,
	sprint,
	onSaved,
}: {
	open: boolean;
	onClose: () => void;
	sprint: Sprint;
	onSaved: (updated: Sprint) => void;
}) {
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<{
		name?: string;
		week?: string;
		submit?: string;
	}>({});

	useEffect(() => {
		if (!open) return;
		const start = new Date(sprint.start_date + "T00:00:00");
		const end = new Date(sprint.end_date + "T00:00:00");
		setForm({ name: sprint.name, week: { start, end }, status: sprint.status });
		setErrors({});
	}, [open, sprint]);

	async function handleSubmit() {
		const errs: typeof errors = {};
		if (!form.name.trim()) errs.name = "Sprint name is required.";
		if (!form.week) errs.week = "Please select a week.";
		if (Object.keys(errs).length > 0) {
			setErrors(errs);
			return;
		}
		setSubmitting(true);
		setErrors({});
		try {
			const updated = await updateSprint(sprint.id, {
				name: form.name.trim(),
				start_date: format(form.week!.start, "yyyy-MM-dd"),
				end_date: format(form.week!.end, "yyyy-MM-dd"),
				status: form.status,
			});
			onSaved(updated);
			onClose();
			toast.success("Sprint updated", { description: updated.name });
		} catch (err: any) {
			const msg = err?.response?.data?.message ?? "Failed to update sprint.";
			setErrors({ submit: msg });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
			<DialogContent className="max-w-[440px]">
				<DialogHeader>
					<DialogTitle>Edit Sprint</DialogTitle>
					<DialogDescription>
						Sprints cover one work week (Mon – Fri).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Sprint Name <span className="text-danger">*</span>
						</label>
						<Input
							value={form.name}
							onChange={(e) => {
								setForm((p) => ({ ...p, name: e.target.value }));
								setErrors((p) => ({ ...p, name: undefined }));
							}}
							className={errors.name ? "border-danger" : ""}
						/>
						{errors.name && (
							<p className="text-xs text-danger mt-1">{errors.name}</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Week <span className="text-danger">*</span>
						</label>
						<WeekPicker
							value={form.week}
							onChange={(w) => {
								setForm((p) => ({ ...p, week: w }));
								setErrors((p) => ({ ...p, week: undefined }));
							}}
						/>
						{errors.week && (
							<p className="text-xs text-danger mt-1">{errors.week}</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Status
						</label>
						<Select
							value={form.status}
							onValueChange={(v) =>
								setForm((p) => ({ ...p, status: v as SprintStatus }))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="planned">Planned</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
							</SelectContent>
						</Select>
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
						{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── SprintsPage ───────────────────────────────────────────────────────────────

export default function SprintsPage() {
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [loading, setLoading] = useState(true);
	const [newOpen, setNewOpen] = useState(false);
	const [editSprint, setEditSprint] = useState<Sprint | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);

	useEffect(() => {
		listSprints()
			.then((data) => setSprints(data))
			.catch(() => toast.error("Failed to load sprints."))
			.finally(() => setLoading(false));
	}, []);

	async function handleDelete(sprintId: string) {
		try {
			await deleteSprint(sprintId);
			setSprints((prev) => prev.filter((s) => s.id !== sprintId));
			setDeletingId(null);
			toast.success("Sprint deleted.");
		} catch {
			toast.error("Failed to delete sprint.");
		}
	}

	async function handleActivate(sprint: Sprint) {
		const alreadyActive = sprints.some((s) => s.status === "active");
		if (alreadyActive) {
			toast.error("Another sprint is already active.");
			return;
		}
		setUpdatingId(sprint.id);
		try {
			const updated = await updateSprint(sprint.id, { status: "active" });
			setSprints((prev) => prev.map((s) => (s.id === sprint.id ? updated : s)));
			toast.success("Sprint started.");
		} catch {
			toast.error("Failed to start sprint.");
		} finally {
			setUpdatingId(null);
		}
	}

	async function handleComplete(sprint: Sprint) {
		setUpdatingId(sprint.id);
		try {
			const updated = await updateSprint(sprint.id, { status: "completed" });
			setSprints((prev) => prev.map((s) => (s.id === sprint.id ? updated : s)));
			toast.success("Sprint ended.");
		} catch {
			toast.error("Failed to end sprint.");
		} finally {
			setUpdatingId(null);
		}
	}

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Header */}
			<div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground tracking-tight">
						Sprints
					</h1>
					<p className="text-sm text-muted mt-1">
						Org-level sprints span one work week (Mon – Fri). Assign projects to a sprint from the project page.
					</p>
				</div>
				<Button className="flex w-full items-center gap-2 sm:w-auto" onClick={() => setNewOpen(true)}>
					<Plus className="h-4 w-4" />
					New Sprint
				</Button>
			</div>

			{/* Content */}
			{loading ? (
				<SprintsListSkeleton />
			) : sprints.length === 0 ? (
				<Card className="p-12 text-center">
					<p className="text-sm font-medium text-foreground mb-1">No sprints yet</p>
					<p className="text-sm text-muted mb-4">
						Create your first sprint to start organizing projects by week.
					</p>
					<Button onClick={() => setNewOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						New Sprint
					</Button>
				</Card>
			) : (
				<div className="space-y-3">
					{sprints.map((sprint) => {
						const { variant, label } = STATUS_BADGE[sprint.status];
						const isDeleting = deletingId === sprint.id;
						const isUpdating = updatingId === sprint.id;
						return (
							<Card
								key={sprint.id}
								className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-foreground">
										{sprint.name}
									</p>
									<p className="text-xs text-muted mt-0.5">
										{formatSprintRange(sprint.start_date, sprint.end_date)}
									</p>
								</div>

								<div className="flex items-center justify-between gap-3 sm:contents">
									<Badge variant={variant} className="shrink-0">{label}</Badge>

								{isDeleting ? (
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-xs text-muted">Delete?</span>
										<Button
											size="sm"
											variant="destructive"
											onClick={() => handleDelete(sprint.id)}
										>
											Yes
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setDeletingId(null)}
										>
											No
										</Button>
									</div>
								) : (
									<div className="flex items-center gap-2 shrink-0">
										{sprint.status === "planned" && (
											<Button
												size="sm"
												variant="outline"
												disabled={isUpdating}
												onClick={() => handleActivate(sprint)}
											>
												{isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
												Start Sprint
											</Button>
										)}
										{sprint.status === "active" && (
											<Button
												size="sm"
												variant="outline"
												disabled={isUpdating}
												onClick={() => handleComplete(sprint)}
											>
												{isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
												End sprint
											</Button>
										)}
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-muted hover:text-foreground"
											onClick={() => setEditSprint(sprint)}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-muted hover:text-danger"
											onClick={() => setDeletingId(sprint.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								)}
								</div>
							</Card>
						);
					})}
				</div>
			)}

			{/* Dialogs */}
			<NewSprintDialog
				open={newOpen}
				onClose={() => setNewOpen(false)}
				onCreated={(sprint) =>
					setSprints((prev) =>
						[...prev, sprint].sort((a, b) =>
							a.start_date.localeCompare(b.start_date),
						),
					)
				}
			/>

			{editSprint && (
				<EditSprintDialog
					open={!!editSprint}
					onClose={() => setEditSprint(null)}
					sprint={editSprint}
					onSaved={(updated) => {
						setSprints((prev) =>
							prev
								.map((s) => (s.id === updated.id ? updated : s))
								.sort((a, b) => a.start_date.localeCompare(b.start_date)),
						);
						setEditSprint(null);
					}}
				/>
			)}
		</div>
	);
}
