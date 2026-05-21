import { useState } from "react";
import { Plus, Pencil, Trash2, Lock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useApiSWR } from "@/hooks/useApiSWR";
import {
	listWorkflowStages,
	createWorkflowStage,
	updateWorkflowStage,
	deleteWorkflowStage,
	type WorkflowStage,
} from "@/services/workflow-stage.service";

const COLOR_PRESETS = [
	"#64748b",
	"#0058be",
	"#006c49",
	"#f59e0b",
	"#dc2626",
	"#7c3aed",
	"#0ea5e9",
	"#ec4899",
];

function StageChip({ label, color }: { label: string; color: string }) {
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
			style={{
				backgroundColor: `${color}1a`,
				color,
				border: `1px solid ${color}33`,
			}}
		>
			<span
				className="h-2 w-2 rounded-full"
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}

export function WorkflowStagesTab({ projectId }: { projectId: string }) {
	const {
		data: stages = [],
		isLoading,
		mutate,
	} = useApiSWR<WorkflowStage[]>(
		["workflow-stages", projectId],
		() => listWorkflowStages(projectId),
	);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<WorkflowStage | null>(null);
	const [label, setLabel] = useState("");
	const [color, setColor] = useState(COLOR_PRESETS[0]);
	const [saving, setSaving] = useState(false);

	function openCreate() {
		setEditing(null);
		setLabel("");
		setColor(COLOR_PRESETS[0]);
		setDialogOpen(true);
	}

	function openEdit(stage: WorkflowStage) {
		setEditing(stage);
		setLabel(stage.name);
		setColor(stage.color);
		setDialogOpen(true);
	}

	async function handleSave() {
		const trimmed = label.trim();
		if (!trimmed) {
			toast.error("Stage name required");
			return;
		}
		const dup = stages.find(
			(s) =>
				s.name.toLowerCase() === trimmed.toLowerCase() &&
				s.id !== editing?.id,
		);
		if (dup) {
			toast.error("Stage name already exists");
			return;
		}

		setSaving(true);
		try {
			if (editing) {
				const payload: { name?: string; color: string } = { color };
				if (!editing.is_system && trimmed !== editing.name) {
					payload.name = trimmed;
				}
				await updateWorkflowStage(projectId, editing.id, payload);
				toast.success("Stage updated");
			} else {
				await createWorkflowStage(projectId, { name: trimmed, color });
				toast.success("Stage created");
			}
			await mutate();
			setDialogOpen(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Save failed";
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(stage: WorkflowStage) {
		if (stage.is_system) return;
		try {
			await deleteWorkflowStage(projectId, stage.id);
			await mutate();
			toast.success("Stage removed");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Delete failed";
			toast.error(msg);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted">
					{isLoading
						? "Loading…"
						: `${stages.length} stage${stages.length !== 1 ? "s" : ""}`}
				</p>
				<Button
					className="flex items-center gap-2"
					onClick={openCreate}
				>
					<Plus className="h-4 w-4" />
					Add Stage
				</Button>
			</div>

			<Card className="p-0 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted-subtle/40">
							{["#", "Stage", "Status", "Type"].map((h) => (
								<th
									key={h}
									className="px-5 py-3 text-xs font-medium text-muted text-left"
								>
									{h}
								</th>
							))}
							<th className="px-5 py-3" />
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={5}
									className="px-5 py-10 text-center text-sm text-muted"
								>
									Loading stages…
								</td>
							</tr>
						) : stages.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-5 py-10 text-center text-sm text-muted"
								>
									No stages yet.
								</td>
							</tr>
						) : (
							stages.map((s, i) => (
								<tr
									key={s.id}
									className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
								>
									<td className="px-5 py-4 text-sm text-muted w-12">
										{i + 1}
									</td>
									<td className="px-5 py-4">
										<p className="text-sm font-medium text-foreground">
											{s.name}
										</p>
									</td>
									<td className="px-5 py-4">
										<StageChip
											label={s.name}
											color={s.color}
										/>
									</td>
									<td className="px-5 py-4">
										{s.is_system ? (
											<span className="inline-flex items-center gap-1 text-xs text-muted">
												<Lock className="h-3 w-3" />
												Default
											</span>
										) : (
											<span className="text-xs text-foreground">
												Custom
											</span>
										)}
									</td>
									<td className="px-5 py-4 text-right">
										<div className="flex items-center justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => openEdit(s)}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											{!s.is_system && (
												<Button
													variant="outline"
													size="sm"
													className="text-danger border-danger/30 hover:bg-danger/5"
													onClick={() =>
														handleDelete(s)
													}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? "Edit Stage" : "Add Stage"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<label className="text-xs font-medium text-muted">
								Name
							</label>
							<Input
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder="e.g. Code Review"
								autoFocus
								disabled={!!editing?.is_system}
							/>
							{editing?.is_system && (
								<p className="text-[11px] text-muted">
									Default stage name cannot be changed.
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-xs font-medium text-muted">
								Status color
							</label>
							<div className="flex flex-wrap items-center gap-2">
								{COLOR_PRESETS.map((c) => {
									const active =
										color.toLowerCase() === c.toLowerCase();
									return (
										<button
											key={c}
											type="button"
											onClick={() => setColor(c)}
											className="relative h-7 w-7 rounded-full border border-border transition-transform hover:scale-110"
											style={{ backgroundColor: c }}
											aria-label={`Pick color ${c}`}
										>
											{active && (
												<Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
											)}
										</button>
									);
								})}
								<label
									className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-border"
									title="Custom color"
								>
									<span
										className="absolute inset-0"
										style={{
											background:
												"conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
										}}
									/>
									<input
										type="color"
										value={color}
										onChange={(e) =>
											setColor(e.target.value)
										}
										className="absolute inset-0 cursor-pointer opacity-0"
									/>
								</label>
							</div>
							<div className="flex items-center gap-2 pt-1">
								<Input
									value={color}
									onChange={(e) => setColor(e.target.value)}
									placeholder="#000000"
									className="h-8 w-28 font-mono text-xs"
								/>
								<span className="text-xs text-muted">
									Preview:
								</span>
								<StageChip
									label={label.trim() || "Stage"}
									color={color}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDialogOpen(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving
								? "Saving…"
								: editing
									? "Save"
									: "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
