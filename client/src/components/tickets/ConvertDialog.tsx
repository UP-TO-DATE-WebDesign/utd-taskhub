import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
	convertTicketToTask,
	type Ticket,
	type ConvertTicketPayload,
} from "@/services/ticket.service";
import {
	listMembers,
	type ProjectMember,
} from "@/services/project-member.service";
import { UNASSIGNED_VALUE } from "@/components/tasks/task-detail/constants";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { TICKET_PRIORITIES, TASK_STATUSES } from "./constants";

interface ConvertDialogProps {
	open: boolean;
	ticket: Ticket | null;
	projectId: string;
	onClose: () => void;
	onConverted: () => void;
}

export function ConvertDialog({
	open,
	ticket,
	projectId,
	onClose,
	onConverted,
}: ConvertDialogProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [taskStatus, setTaskStatus] = useState("backlog");
	const [assignedTo, setAssignedTo] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [tags, setTags] = useState("");
	const [boardColumnId, setBoardColumnId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [titleError, setTitleError] = useState("");
	const [members, setMembers] = useState<ProjectMember[]>([]);
	const [membersLoading, setMembersLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		setMembersLoading(true);
		listMembers(projectId)
			.then(setMembers)
			.catch(() => setMembers([]))
			.finally(() => setMembersLoading(false));
	}, [open, projectId]);

	useEffect(() => {
		if (open && ticket) {
			setTitle(ticket.title);
			setDescription(ticket.description ?? "");
			setPriority(ticket.priority);
			setTaskStatus("backlog");
			setAssignedTo(ticket.assigned_to?.id ?? "");
			setDueDate(ticket.due_date ?? "");
			setTags("");
			setBoardColumnId("");
			setTitleError("");
		}
	}, [open, ticket]);

	async function handleSubmit() {
		if (!title.trim()) {
			setTitleError("Title is required.");
			return;
		}
		if (!ticket) return;
		setSubmitting(true);
		setTitleError("");
		try {
			const payload: ConvertTicketPayload = {
				title: title.trim(),
				description: projectDescriptionText(description) || undefined,
				priority: priority || undefined,
				status: taskStatus || undefined,
				assigned_to: assignedTo.trim() || undefined,
				due_date: dueDate || undefined,
				tags: tags.trim()
					? tags
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean)
					: undefined,
				board_column_id: boardColumnId.trim() || undefined,
			};
			await convertTicketToTask(projectId, ticket.id, payload);
			toast.success("Ticket converted to task.");
			onConverted();
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Conversion failed.";
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				if (!val) onClose();
			}}
		>
			<DialogContent className="max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Convert to Task</DialogTitle>
					<DialogDescription>
						Review and adjust the task details before converting.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Title <span className="text-danger">*</span>
						</label>
						<Input
							value={title}
							onChange={(e) => {
								setTitle(e.target.value);
								setTitleError("");
							}}
							className={
								titleError
									? "border-danger focus:ring-danger"
									: ""
							}
						/>
						{titleError && (
							<p className="text-xs text-danger mt-1">
								{titleError}
							</p>
						)}
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Description
						</label>
						<ProjectDescriptionEditor
							placeholder="Additional details..."
							value={description}
							onChange={setDescription}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Priority
							</label>
							<SearchableSelect
								value={priority}
								onValueChange={setPriority}
								options={TICKET_PRIORITIES.map<SearchableSelectOption>((p) => ({
									value: p,
									label: p.charAt(0).toUpperCase() + p.slice(1),
								}))}
							/>
						</div>

						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<SearchableSelect
								value={taskStatus}
								onValueChange={setTaskStatus}
								options={TASK_STATUSES.map<SearchableSelectOption>((s) => ({
									value: s,
									label: s
										.replace("_", " ")
										.replace(/^./, (c) => c.toUpperCase()),
								}))}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Assigned To
							</label>
							<SearchableSelect
								value={assignedTo || UNASSIGNED_VALUE}
								onValueChange={(v) =>
									setAssignedTo(
										v === UNASSIGNED_VALUE ? "" : v,
									)
								}
								disabled={membersLoading}
								loading={membersLoading}
								placeholder={
									membersLoading
										? "Loading members..."
										: "Unassigned"
								}
								options={[
									{
										value: UNASSIGNED_VALUE,
										label: "Unassigned",
									},
									...members.map<SearchableSelectOption>((m) => ({
										value: m.profiles.id,
										label:
											m.profiles.full_name ??
											m.profiles.email,
										description: m.profiles.full_name
											? m.profiles.email
											: undefined,
									})),
								]}
							/>
						</div>

						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Due Date
							</label>
							<Input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Tags (comma-separated)
						</label>
						<Input
							placeholder="e.g. auth, ui, critical"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
						/>
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Board Column ID (UUID)
						</label>
						<Input
							placeholder="Column UUID (optional)"
							value={boardColumnId}
							onChange={(e) => setBoardColumnId(e.target.value)}
						/>
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
						Convert to Task
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
