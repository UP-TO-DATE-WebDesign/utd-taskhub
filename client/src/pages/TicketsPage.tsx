import { useState, useEffect, useMemo } from "react";
import {
	Plus,
	Loader2,
	Ticket as TicketIcon,
	MoreHorizontal,
	ArrowRightCircle,
	Pencil,
	Trash2,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { listProjects, type Project } from "@/services/project.service";
import {
	listTickets,
	createTicket,
	updateTicket,
	closeTicket,
	deleteTicket,
	convertTicketToTask,
	checkTicketCode,
	getNextTicketCode,
	type Ticket,
	type TicketType,
	type TicketStatus,
	type TicketPriority,
	type CreateTicketPayload,
	type UpdateTicketPayload,
	type ConvertTicketPayload,
} from "@/services/ticket.service";
import {
	listMembers,
	type ProjectMember,
} from "@/services/project-member.service";
import { UNASSIGNED_VALUE } from "@/components/tasks/task-detail/constants";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { PermissionGate } from "@/components/PermissionGate";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { TicketsTableSkeleton } from "@/components/tickets/TicketsTableSkeleton";
import { useApiSWR } from "@/hooks/useApiSWR";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

type BadgeVariant =
	| "urgent"
	| "high"
	| "medium"
	| "low"
	| "open"
	| "review"
	| "done"
	| "cancelled"
	| "accent"
	| "default";

function priorityVariant(p: TicketPriority): BadgeVariant {
	return p as BadgeVariant;
}

function statusVariant(s: TicketStatus): BadgeVariant {
	const map: Record<TicketStatus, BadgeVariant> = {
		open: "open",
		in_review: "review",
		resolved: "done",
		closed: "cancelled",
		cancelled: "cancelled",
	};
	return map[s];
}

function typeVariant(t: TicketType): BadgeVariant {
	const map: Record<TicketType, BadgeVariant> = {
		bug: "urgent",
		feature_request: "medium",
		issue: "high",
		support: "accent",
		other: "default",
	};
	return map[t];
}

function typeLabel(t: TicketType): string {
	const map: Record<TicketType, string> = {
		bug: "Bug",
		feature_request: "Feature Request",
		issue: "Issue",
		support: "Support",
		other: "Other",
	};
	return map[t];
}

function statusLabel(s: TicketStatus): string {
	const map: Record<TicketStatus, string> = {
		open: "Open",
		in_review: "In Review",
		resolved: "Resolved",
		closed: "Closed",
		cancelled: "Cancelled",
	};
	return map[s];
}

const TICKET_TYPES: TicketType[] = [
	"bug",
	"feature_request",
	"issue",
	"support",
	"other",
];
const TICKET_STATUSES: TicketStatus[] = [
	"open",
	"in_review",
	"resolved",
	"closed",
	"cancelled",
];
const TICKET_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];
const TASK_STATUSES = [
	"backlog",
	"todo",
	"in_progress",
	"review",
	"done",
	"cancelled",
] as const;

// ── TicketDialog (create / edit) ──────────────────────────────────────────────

interface TicketDialogProps {
	open: boolean;
	mode: "create" | "edit";
	ticket?: Ticket;
	projectId: string;
	onClose: () => void;
	onSaved: () => void;
}

function TicketDialog({
	open,
	mode,
	ticket,
	projectId,
	onClose,
	onSaved,
}: TicketDialogProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState<TicketType>("bug");
	const [priority, setPriority] = useState<TicketPriority>("medium");
	const [status, setStatus] = useState<TicketStatus>("open");
	const [assignedTo, setAssignedTo] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [ticketCode, setTicketCode] = useState("");
	const [codeStatus, setCodeStatus] = useState<
		"idle" | "checking" | "available" | "taken" | "invalid"
	>("idle");
	const [codeMessage, setCodeMessage] = useState("");
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
		if (!open) return;
		setTitleError("");
		setCodeStatus("idle");
		setCodeMessage("");
		if (mode === "edit" && ticket) {
			setTitle(ticket.title);
			setDescription(ticket.description ?? "");
			setType(ticket.type);
			setPriority(ticket.priority);
			setStatus(ticket.status);
			setAssignedTo(ticket.assigned_to?.id ?? "");
			setDueDate(ticket.due_date ?? "");
			setTicketCode(ticket.ticket_code);
		} else {
			setTitle("");
			setDescription("");
			setType("bug");
			setPriority("medium");
			setStatus("open");
			setAssignedTo("");
			setDueDate("");
			setTicketCode("");
			getNextTicketCode(projectId)
				.then((code) => setTicketCode(code))
				.catch(() => {
					/* fallback: leave blank, server will autogen on submit */
				});
		}
	}, [open, mode, ticket, projectId]);

	useEffect(() => {
		if (!open) return;
		const trimmed = ticketCode.trim().toUpperCase();
		if (!trimmed) {
			setCodeStatus("idle");
			setCodeMessage("");
			return;
		}
		if (mode === "edit" && ticket && trimmed === ticket.ticket_code) {
			setCodeStatus("available");
			setCodeMessage("");
			return;
		}
		if (!/^[A-Z0-9][A-Z0-9-]{0,29}$/.test(trimmed)) {
			setCodeStatus("invalid");
			setCodeMessage(
				"Use uppercase letters, digits, dashes (e.g. WEB-001).",
			);
			return;
		}
		setCodeStatus("checking");
		setCodeMessage("");
		const handle = setTimeout(async () => {
			try {
				const res = await checkTicketCode(
					projectId,
					trimmed,
					mode === "edit" ? ticket?.id : undefined,
				);
				if (res.available) {
					setCodeStatus("available");
					setCodeMessage("");
				} else {
					setCodeStatus("taken");
					setCodeMessage(
						res.reason ?? "Already used in this project.",
					);
				}
			} catch {
				setCodeStatus("idle");
				setCodeMessage("");
			}
		}, 350);
		return () => clearTimeout(handle);
	}, [ticketCode, open, mode, ticket, projectId]);

	async function handleSubmit() {
		if (!title.trim()) {
			setTitleError("Title is required.");
			return;
		}
		setSubmitting(true);
		setTitleError("");
		try {
			const codeForPayload = ticketCode.trim().toUpperCase() || undefined;
			if (mode === "create") {
				const payload: CreateTicketPayload = {
					title: title.trim(),
					description:
						projectDescriptionText(description) || undefined,
					type,
					priority,
					status,
					assigned_to: assignedTo.trim() || undefined,
					due_date: dueDate || undefined,
					ticket_code: codeForPayload,
				};
				await createTicket(projectId, payload);
				toast.success("Ticket created.");
			} else if (ticket) {
				const payload: UpdateTicketPayload = {
					title: title.trim(),
					description:
						projectDescriptionText(description) || undefined,
					type,
					priority,
					status,
					assigned_to: assignedTo.trim() || undefined,
					due_date: dueDate || undefined,
					ticket_code: codeForPayload,
				};
				await updateTicket(projectId, ticket.id, payload);
				toast.success("Ticket updated.");
			}
			onSaved();
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Something went wrong.";
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
					<DialogTitle>
						{mode === "create" ? "New Ticket" : "Edit Ticket"}
					</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? "Create a new ticket for this project."
							: "Update ticket details."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Ticket Code
						</label>
						<Input
							placeholder="e.g. WEB-001"
							value={ticketCode}
							onChange={(e) =>
								setTicketCode(e.target.value.toUpperCase())
							}
							className={
								codeStatus === "taken" ||
								codeStatus === "invalid"
									? "border-danger focus:ring-danger font-mono"
									: "font-mono"
							}
						/>
						<p
							className={`text-xs mt-1 ${
								codeStatus === "available"
									? "text-success"
									: codeStatus === "taken" ||
										  codeStatus === "invalid"
										? "text-danger"
										: "text-muted-foreground"
							}`}
						>
							{codeStatus === "checking" && "Checking…"}
							{codeStatus === "available" && "Available."}
							{(codeStatus === "taken" ||
								codeStatus === "invalid") &&
								codeMessage}
							{codeStatus === "idle" &&
								"Autofilled. Edit to customize."}
						</p>
					</div>

					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Title <span className="text-danger">*</span>
						</label>
						<Input
							placeholder="Describe the issue..."
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
								Type
							</label>
							<SearchableSelect
								value={type}
								onValueChange={(v) => setType(v as TicketType)}
								options={TICKET_TYPES.map<SearchableSelectOption>((t) => ({
									value: t,
									label: typeLabel(t),
								}))}
							/>
						</div>

						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Priority
							</label>
							<SearchableSelect
								value={priority}
								onValueChange={(v) =>
									setPriority(v as TicketPriority)
								}
								options={TICKET_PRIORITIES.map<SearchableSelectOption>((p) => ({
									value: p,
									label: p.charAt(0).toUpperCase() + p.slice(1),
								}))}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Status
							</label>
							<SearchableSelect
								value={status}
								onValueChange={(v) =>
									setStatus(v as TicketStatus)
								}
								options={TICKET_STATUSES.map<SearchableSelectOption>((s) => ({
									value: s,
									label: statusLabel(s),
								}))}
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
							Assigned To
						</label>
						<SearchableSelect
							value={assignedTo || UNASSIGNED_VALUE}
							onValueChange={(v) =>
								setAssignedTo(v === UNASSIGNED_VALUE ? "" : v)
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
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleSubmit}
						disabled={
							submitting ||
							codeStatus === "checking" ||
							codeStatus === "taken" ||
							codeStatus === "invalid"
						}
					>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						{mode === "create" ? "Create Ticket" : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── ConvertDialog ─────────────────────────────────────────────────────────────

interface ConvertDialogProps {
	open: boolean;
	ticket: Ticket | null;
	projectId: string;
	onClose: () => void;
	onConverted: () => void;
}

function ConvertDialog({
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

// ── TicketRow ─────────────────────────────────────────────────────────────────

interface TicketRowProps {
	ticket: Ticket;
	deleting: boolean;
	canEdit: boolean;
	canDelete: boolean;
	canConvert: boolean;
	onEdit: (t: Ticket) => void;
	onConvert: (t: Ticket) => void;
	onDelete: (t: Ticket) => void;
	onClose: (t: Ticket) => void;
}

function TicketRow({
	ticket,
	deleting,
	canEdit,
	canDelete,
	canConvert,
	onEdit,
	onConvert,
	onDelete,
	onClose,
}: TicketRowProps) {
	const canCloseTicket =
		canEdit && ticket.status !== "closed" && ticket.status !== "cancelled";
	return (
		<tr className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors">
			{/* Title */}
			<td className="px-5 py-3.5 max-w-[240px]">
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted-subtle px-1.5 py-0.5 rounded shrink-0">
						{ticket.ticket_code}
					</span>
					<p className="text-sm font-semibold text-foreground truncate">
						{ticket.title}
					</p>
				</div>
				{ticket.description && (
					<p className="text-xs text-muted truncate mt-0.5">
						{ticket.description}
					</p>
				)}
			</td>

			{/* Type */}
			<td className="px-4 py-3.5">
				<Badge variant={typeVariant(ticket.type)}>
					{typeLabel(ticket.type)}
				</Badge>
			</td>

			{/* Priority */}
			<td className="px-4 py-3.5">
				<Badge
					variant={priorityVariant(ticket.priority)}
					className="capitalize"
				>
					{ticket.priority}
				</Badge>
			</td>

			{/* Status */}
			<td className="px-4 py-3.5">
				<Badge variant={statusVariant(ticket.status)}>
					{statusLabel(ticket.status)}
				</Badge>
			</td>

			{/* Assigned To */}
			<td className="px-4 py-3.5">
				{ticket.assigned_to ? (
					<div className="flex items-center gap-2">
						<Avatar className="h-6 w-6">
							<AvatarFallback className="text-[9px]">
								{getInitials(ticket.assigned_to.full_name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-foreground">
							{ticket.assigned_to.full_name ??
								ticket.assigned_to.email}
						</span>
					</div>
				) : (
					<span className="text-xs text-muted">Unassigned</span>
				)}
			</td>

			{/* Created */}
			<td className="px-4 py-3.5 text-xs text-muted whitespace-nowrap">
				{formatDate(ticket.created_at)}
			</td>

			{/* Actions */}
			<td className="px-4 py-3.5">
				<div className="flex items-center gap-2 justify-end">
					{ticket.converted_task_id !== null ? (
						<Badge variant="done" className="text-[10px]">
							Converted
						</Badge>
					) : null}
					{(canEdit || canDelete || canConvert) && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted-subtle hover:text-foreground transition-colors focus:outline-none"
									disabled={deleting}
								>
									{deleting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<MoreHorizontal className="h-4 w-4" />
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								{canConvert &&
									ticket.converted_task_id === null && (
										<DropdownMenuItem
											className="gap-2 text-sm"
											onSelect={() => onConvert(ticket)}
										>
											<ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
											Make Task
										</DropdownMenuItem>
									)}
								{canEdit && (
									<DropdownMenuItem
										className="gap-2 text-sm"
										onSelect={() => onEdit(ticket)}
									>
										<Pencil className="h-4 w-4 text-muted-foreground" />
										Edit
									</DropdownMenuItem>
								)}
								{canCloseTicket && (
									<DropdownMenuItem
										className="gap-2 text-sm"
										onSelect={() => onClose(ticket)}
									>
										<CheckCircle2 className="h-4 w-4 text-muted-foreground" />
										Close ticket
									</DropdownMenuItem>
								)}
								{canDelete &&
									(canConvert || canCloseTicket) && (
										<DropdownMenuSeparator />
									)}
								{canDelete && (
									<DropdownMenuItem
										className="gap-2 text-sm text-danger focus:text-danger focus:bg-danger/10"
										onSelect={() => onDelete(ticket)}
									>
										<Trash2 className="h-4 w-4" />
										Delete
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</td>
		</tr>
	);
}

// ── CloseTicketDialog ─────────────────────────────────────────────────────────

interface CloseTicketDialogProps {
	open: boolean;
	ticket: Ticket | null;
	projectId: string;
	onClose: () => void;
	onClosed: () => void;
}

function CloseTicketDialog({
	open,
	ticket,
	projectId,
	onClose,
	onClosed,
}: CloseTicketDialogProps) {
	const [resolution, setResolution] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) setResolution("");
	}, [open]);

	async function handleConfirm() {
		if (!ticket) return;
		setSubmitting(true);
		try {
			await closeTicket(
				projectId,
				ticket.id,
				resolution.trim() ? resolution.trim() : undefined,
			);
			toast.success("Ticket closed.");
			onClosed();
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to close ticket.";
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) onClose();
			}}
		>
			<DialogContent className="max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Close ticket</DialogTitle>
					<DialogDescription>
						Closing locks the ticket. Admins and project managers
						will be notified.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<p className="text-sm text-foreground font-medium truncate">
						{ticket?.title}
					</p>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Resolution note (optional)
						</label>
						<textarea
							className="w-full min-h-[96px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							placeholder="Summarize what was done, link a PR, etc."
							maxLength={2000}
							value={resolution}
							onChange={(e) => setResolution(e.target.value)}
						/>
						<p className="mt-1 text-[10px] text-muted-foreground">
							{resolution.length}/2000
						</p>
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={handleConfirm} disabled={submitting}>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Close ticket
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface Filters {
	status: TicketStatus | "";
	type: TicketType | "";
	priority: TicketPriority | "";
}

export default function TicketsPage() {
	const { user } = useAuth();
	const { can, roleKey } = usePermission();

	function canEditTicket(ticket: Ticket): boolean {
		if (roleKey === "user") return ticket.created_by.id === user?.id;
		return can("Edit tickets");
	}

	function canDeleteTicket(ticket: Ticket): boolean {
		if (roleKey === "user") return ticket.created_by.id === user?.id;
		return can("Delete tickets");
	}

	const canConvert = can("Create & edit tasks");

	const [projects, setProjects] = useState<Project[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(true);
	const [selectedProjectId, setSelectedProjectId] = useState<string>("");

	const [filters, setFilters] = useState<Filters>({
		status: "",
		type: "",
		priority: "",
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [editTicket, setEditTicket] = useState<Ticket | null>(null);
	const [convertTicket, setConvertTicket] = useState<Ticket | null>(null);
	const [closingTicket, setClosingTicket] = useState<Ticket | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Load projects on mount
	useEffect(() => {
		setProjectsLoading(true);
		listProjects()
			.then((data) => {
				setProjects(data);
				if (data.length > 0) setSelectedProjectId(data[0].id);
			})
			.catch(() => toast.error("Failed to load projects."))
			.finally(() => setProjectsLoading(false));
	}, []);

	const ticketParams = useMemo(
		() => ({
			status: filters.status || undefined,
			type: filters.type || undefined,
			priority: filters.priority || undefined,
		}),
		[filters.status, filters.type, filters.priority],
	);

	const ticketsKey = selectedProjectId
		? (["tickets", selectedProjectId, ticketParams] as const)
		: null;

	const {
		data: tickets = [],
		error,
		isLoading: loading,
		mutate: mutateTickets,
	} = useApiSWR<Ticket[]>(ticketsKey, () =>
		listTickets(
			selectedProjectId,
			ticketParams as Parameters<typeof listTickets>[1],
		),
	);

	async function handleDelete(ticket: Ticket) {
		if (!window.confirm(`Delete "${ticket.title}"? This cannot be undone.`))
			return;
		setDeletingId(ticket.id);
		try {
			await deleteTicket(selectedProjectId, ticket.id);
			toast.success("Ticket deleted.");
			mutateTickets();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to delete ticket.";
			toast.error(msg);
		} finally {
			setDeletingId(null);
		}
	}

	function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}

	const hasFilters = filters.status || filters.type || filters.priority;

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Header */}
			<div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						Tickets
					</h1>
					<p className="text-sm text-muted mt-1">
						{selectedProjectId
							? `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`
							: "Select a project to view tickets"}
					</p>
				</div>
				<PermissionGate feature="Create tickets">
					<Button
						className="flex items-center gap-2"
						disabled={!selectedProjectId}
						onClick={() => setCreateOpen(true)}
					>
						<Plus className="h-4 w-4" />
						New Ticket
					</Button>
				</PermissionGate>
			</div>

			{/* Project selector + Filters */}
			<div className="flex flex-wrap items-center gap-3 mb-6">
				{/* Project */}
				<div className="w-full sm:w-auto sm:min-w-[200px]">
					{projectsLoading ? (
						<div className="h-9 rounded-md border border-border bg-muted-subtle animate-pulse" />
					) : (
						<SearchableSelect
							value={selectedProjectId}
							onValueChange={setSelectedProjectId}
							placeholder="Select project..."
							options={projects.map<SearchableSelectOption>((p) => ({
								value: p.id,
								label: p.name,
							}))}
						/>
					)}
				</div>

				<div className="h-5 w-px bg-border hidden sm:block" />

				{/* Status filter */}
				<div className="w-[140px]">
					<SearchableSelect
						value={filters.status || "all"}
						onValueChange={(v) =>
							setFilter(
								"status",
								v === "all" || !v ? "" : (v as TicketStatus),
							)
						}
						placeholder="Status"
						options={[
							{ value: "all", label: "All statuses" },
							...TICKET_STATUSES.map<SearchableSelectOption>((s) => ({
								value: s,
								label: statusLabel(s),
							})),
						]}
					/>
				</div>

				{/* Type filter */}
				<div className="w-[160px]">
					<SearchableSelect
						value={filters.type || "all"}
						onValueChange={(v) =>
							setFilter(
								"type",
								v === "all" || !v ? "" : (v as TicketType),
							)
						}
						placeholder="Type"
						options={[
							{ value: "all", label: "All types" },
							...TICKET_TYPES.map<SearchableSelectOption>((t) => ({
								value: t,
								label: typeLabel(t),
							})),
						]}
					/>
				</div>

				{/* Priority filter */}
				<div className="w-[140px]">
					<SearchableSelect
						value={filters.priority || "all"}
						onValueChange={(v) =>
							setFilter(
								"priority",
								v === "all" || !v ? "" : (v as TicketPriority),
							)
						}
						placeholder="Priority"
						options={[
							{ value: "all", label: "All priorities" },
							...TICKET_PRIORITIES.map<SearchableSelectOption>((p) => ({
								value: p,
								label: p.charAt(0).toUpperCase() + p.slice(1),
							})),
						]}
					/>
				</div>

				{hasFilters && (
					<button
						onClick={() =>
							setFilters({ status: "", type: "", priority: "" })
						}
						className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2"
					>
						Clear filters
					</button>
				)}
			</div>

			{/* Loading */}
			{loading && <TicketsTableSkeleton />}

			{/* Error */}
			{!loading && error && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-base font-medium text-foreground mb-1">
						Something went wrong
					</p>
					<p className="text-sm text-muted mb-4">{error.message}</p>
					<Button variant="outline" onClick={() => mutateTickets()}>
						Retry
					</Button>
				</div>
			)}

			{/* No project selected */}
			{!loading && !error && !selectedProjectId && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<TicketIcon className="h-10 w-10 text-border-strong mb-4" />
					<p className="text-base font-medium text-foreground mb-1">
						No project selected
					</p>
					<p className="text-sm text-muted">
						Choose a project above to view its tickets.
					</p>
				</div>
			)}

			{/* Empty */}
			{!loading &&
				!error &&
				selectedProjectId &&
				tickets.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<TicketIcon className="h-10 w-10 text-border-strong mb-4" />
						<p className="text-base font-medium text-foreground mb-1">
							No tickets found
						</p>
						<p className="text-sm text-muted">
							{hasFilters
								? "Try adjusting your filters."
								: "Create the first ticket for this project."}
						</p>
					</div>
				)}

			{/* Table */}
			{!loading && !error && selectedProjectId && tickets.length > 0 && (
				<Card className="p-0 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border bg-muted-subtle">
									{[
										"Title",
										"Type",
										"Priority",
										"Status",
										"Assigned To",
										"Created",
										"",
									].map((h, i) => (
										<th
											key={i}
											className={`px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left ${i === 0 ? "pl-5" : ""}`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{tickets.map((t) => (
									<TicketRow
										key={t.id}
										ticket={t}
										deleting={deletingId === t.id}
										canEdit={canEditTicket(t)}
										canDelete={canDeleteTicket(t)}
										canConvert={canConvert}
										onEdit={setEditTicket}
										onConvert={setConvertTicket}
										onDelete={handleDelete}
										onClose={setClosingTicket}
									/>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			)}

			{/* Dialogs */}
			<TicketDialog
				open={createOpen}
				mode="create"
				projectId={selectedProjectId}
				onClose={() => setCreateOpen(false)}
				onSaved={() => mutateTickets()}
			/>

			<TicketDialog
				open={editTicket !== null}
				mode="edit"
				ticket={editTicket ?? undefined}
				projectId={selectedProjectId}
				onClose={() => setEditTicket(null)}
				onSaved={() => mutateTickets()}
			/>

			<ConvertDialog
				open={convertTicket !== null}
				ticket={convertTicket}
				projectId={selectedProjectId}
				onClose={() => setConvertTicket(null)}
				onConverted={() => mutateTickets()}
			/>

			<CloseTicketDialog
				open={closingTicket !== null}
				ticket={closingTicket}
				projectId={selectedProjectId}
				onClose={() => setClosingTicket(null)}
				onClosed={() => mutateTickets()}
			/>
		</div>
	);
}
