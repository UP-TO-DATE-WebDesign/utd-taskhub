import { useEffect, useState } from "react";
import {
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon, IconPicker, type IconName } from "@/components/ui/icon-picker";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermission } from "@/hooks/usePermission";
import {
	createTaskType,
	deleteTaskType,
	listTaskTypes,
	updateTaskType,
	type TaskType,
} from "@/services/task-type.service";
import { SectionBlock } from "./SectionBlock";

const COLOR_SWATCHES = [
	"#0058be",
	"#006c49",
	"#dc2626",
	"#7c3aed",
	"#ea580c",
	"#0891b2",
	"#db2777",
	"#475569",
];

type FormState = {
	key: string;
	name: string;
	description: string;
	color: string;
	icon: string;
	is_default: boolean;
};

const EMPTY_FORM: FormState = {
	key: "",
	name: "",
	description: "",
	color: COLOR_SWATCHES[0],
	icon: "circle-dot",
	is_default: false,
};

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function TaskTypeDialog({
	open,
	onClose,
	editing,
	onSaved,
}: {
	open: boolean;
	onClose: () => void;
	editing: TaskType | null;
	onSaved: () => void;
}) {
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const isEdit = editing !== null;

	useEffect(() => {
		if (!open) return;
		if (editing) {
			setForm({
				key: editing.key,
				name: editing.name,
				description: editing.description ?? "",
				color: editing.color,
				icon: editing.icon,
				is_default: editing.is_default,
			});
		} else {
			setForm(EMPTY_FORM);
		}
	}, [editing, open]);

	async function handleSave() {
		const name = form.name.trim();
		if (!name) {
			toast.error("Name is required.");
			return;
		}

		setSaving(true);
		try {
			if (isEdit && editing) {
				await updateTaskType(editing.id, {
					name,
					description: form.description.trim() || null,
					color: form.color,
					icon: form.icon,
					is_default: form.is_default,
				});
				toast.success("Task type updated.");
			} else {
				const key = slugify(form.key || form.name);
				if (!key) {
					toast.error("Key is required.");
					return;
				}
				await createTaskType({
					key,
					name,
					description: form.description.trim() || null,
					color: form.color,
					icon: form.icon,
					is_default: form.is_default,
				});
				toast.success("Task type created.");
			}
			onSaved();
			onClose();
		} catch (err) {
			toast.error(
				(err as Error).message || "Failed to save task type.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
			<DialogContent className="max-w-[480px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Task Type" : "New Task Type"}</DialogTitle>
					<DialogDescription>
						Define how tasks are categorized across this workspace.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Name
						</label>
						<Input
							value={form.name}
							onChange={(e) =>
								setForm((f) => ({ ...f, name: e.target.value }))
							}
							placeholder="e.g. Spike"
							disabled={saving}
						/>
					</div>

					{!isEdit && (
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Key
							</label>
							<Input
								value={form.key}
								onChange={(e) =>
									setForm((f) => ({ ...f, key: e.target.value }))
								}
								placeholder="auto-generated from name"
								disabled={saving}
							/>
							<p className="text-xs text-muted mt-1">
								Lowercase, digits, underscores. Used internally.
							</p>
						</div>
					)}

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Description
						</label>
						<Input
							value={form.description}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									description: e.target.value,
								}))
							}
							placeholder="Optional"
							disabled={saving}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Icon
							</label>
							<IconPicker
								value={form.icon as IconName}
								onValueChange={(v) =>
									setForm((f) => ({ ...f, icon: v }))
								}
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Color
							</label>
							<div className="flex flex-wrap gap-1.5">
								{COLOR_SWATCHES.map((c) => (
									<button
										key={c}
										type="button"
										onClick={() =>
											setForm((f) => ({ ...f, color: c }))
										}
										className={cn(
											"h-7 w-7 rounded-full border-2 transition",
											form.color === c
												? "border-foreground"
												: "border-transparent",
										)}
										style={{ background: c }}
										aria-label={c}
									/>
								))}
							</div>
						</div>
					</div>

					<label className="flex items-center gap-2 text-sm text-foreground">
						<input
							type="checkbox"
							checked={form.is_default}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									is_default: e.target.checked,
								}))
							}
							disabled={saving}
							className="h-4 w-4 accent-primary"
						/>
						Set as default task type
					</label>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						{isEdit ? "Save Changes" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteDialog({
	taskType,
	onClose,
	onDeleted,
}: {
	taskType: TaskType | null;
	onClose: () => void;
	onDeleted: () => void;
}) {
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		if (!taskType) return;
		setDeleting(true);
		try {
			await deleteTaskType(taskType.id);
			toast.success("Task type deleted.");
			onDeleted();
			onClose();
		} catch (err) {
			toast.error(
				(err as Error).message || "Failed to delete task type.",
			);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<Dialog
			open={taskType !== null}
			onOpenChange={(val) => { if (!val) onClose(); }}
		>
			<DialogContent className="max-w-[420px]">
				<DialogHeader>
					<DialogTitle>Delete task type</DialogTitle>
					<DialogDescription>
						Remove "{taskType?.name}" from this workspace. This
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						disabled={deleting}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleting}
					>
						{deleting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function TaskTypesSection() {
	const [items, setItems] = useState<TaskType[]>([]);
	const [loading, setLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<TaskType | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TaskType | null>(null);
	const { can } = usePermission();
	const canManage = can("Manage role permissions");

	async function refresh() {
		setLoading(true);
		try {
			const data = await listTaskTypes();
			setItems(data);
		} catch (err) {
			toast.error(
				(err as Error).message || "Failed to load task types.",
			);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		refresh();
	}, []);

	function openCreate() {
		setEditing(null);
		setDialogOpen(true);
	}

	function openEdit(item: TaskType) {
		setEditing(item);
		setDialogOpen(true);
	}

	return (
		<>
			<SectionBlock
				title="Task Types"
				description="Manage the categories used to classify tasks across this workspace."
			>
				<div className="flex items-center justify-between mb-4">
					<div />
					<PermissionGate feature="Manage role permissions">
						<Button size="sm" onClick={openCreate}>
							<Plus className="h-3.5 w-3.5" />
							Add Task Type
						</Button>
					</PermissionGate>
				</div>

				<div className="rounded-lg border border-border overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted-subtle">
								{["Type", "Key", "Description", "Default", "Action"].map(
									(h, i) => (
										<th
											key={h}
											className={cn(
												"px-4 py-2.5 text-xs font-medium text-muted",
												i === 4 ? "text-right" : "text-left",
											)}
										>
											{h}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr>
									<td
										colSpan={5}
										className="px-4 py-6 text-center"
									>
										<div className="flex items-center justify-center gap-2 text-muted">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-sm">
												Loading task types...
											</span>
										</div>
									</td>
								</tr>
							)}
							{!loading && items.length === 0 && (
								<tr>
									<td
										colSpan={5}
										className="px-4 py-6 text-center text-sm text-muted"
									>
										No task types yet.
									</td>
								</tr>
							)}
							{!loading &&
								items.map((t) => (
									<tr
										key={t.id}
										className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2.5">
												<span
													className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
													style={{ background: t.color }}
												>
													<Icon
														name={t.icon as IconName}
														className="h-3.5 w-3.5"
													/>
												</span>
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium text-foreground">
														{t.name}
													</span>
													{t.is_system && (
														<Badge
															variant="backlog"
															className="text-[10px]"
														>
															System
														</Badge>
													)}
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<code className="text-xs text-muted bg-muted-subtle px-1.5 py-0.5 rounded">
												{t.key}
											</code>
										</td>
										<td className="px-4 py-3 text-sm text-muted-foreground">
											{t.description || (
												<span className="text-muted">
													&mdash;
												</span>
											)}
										</td>
										<td className="px-4 py-3">
											{t.is_default ? (
												<Badge
													variant="in-progress"
													className="text-[10px]"
												>
													Default
												</Badge>
											) : (
												<span className="text-xs text-muted">
													&mdash;
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-right">
											{canManage ? (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<button className="text-muted hover:text-foreground transition-colors p-1 rounded">
															<MoreHorizontal className="h-4 w-4" />
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="flex items-center gap-2"
															onSelect={() => openEdit(t)}
														>
															<Pencil className="h-3.5 w-3.5" />
															Edit
														</DropdownMenuItem>
														{!t.is_system && (
															<DropdownMenuItem
																className="flex items-center gap-2 text-danger focus:text-danger"
																onSelect={() =>
																	setDeleteTarget(t)
																}
															>
																<Trash2 className="h-3.5 w-3.5" />
																Delete
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											) : (
												<span />
											)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</SectionBlock>

			<TaskTypeDialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				editing={editing}
				onSaved={refresh}
			/>

			<DeleteDialog
				taskType={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onDeleted={refresh}
			/>
		</>
	);
}
