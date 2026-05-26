import { useState, useEffect, useRef } from "react";
import { Loader2, Paperclip, X, FileText, Video } from "lucide-react";
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
	createTicket,
	updateTicket,
	checkTicketCode,
	getNextTicketCode,
	type Ticket,
	type TicketType,
	type TicketStatus,
	type TicketPriority,
	type CreateTicketPayload,
	type UpdateTicketPayload,
} from "@/services/ticket.service";
import { uploadTicketAttachment } from "@/services/ticket-attachment.service";
import { TicketAttachments } from "./TicketAttachments";
import {
	MAX_BYTES,
	ALLOWED_MIME,
	ACCEPT_ATTR,
	isImage,
	isVideo,
	formatSize,
} from "./attachment-constants";
import {
	listMembers,
	type ProjectMember,
} from "@/services/project-member.service";
import type { Project } from "@/services/project.service";
import { UNASSIGNED_VALUE } from "@/components/tasks/task-detail/constants";
import { ProjectDescriptionEditor } from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import {
	TICKET_TYPES,
	TICKET_STATUSES,
	TICKET_PRIORITIES,
} from "./constants";
import { typeLabel, statusLabel } from "./utils";

interface TicketDialogProps {
	open: boolean;
	mode: "create" | "edit";
	ticket?: Ticket;
	projectId: string;
	projects: Project[];
	onClose: () => void;
	onSaved: () => void;
}

export function TicketDialog({
	open,
	mode,
	ticket,
	projectId,
	projects,
	onClose,
	onSaved,
}: TicketDialogProps) {
	const [formProjectId, setFormProjectId] = useState("");
	const [projectError, setProjectError] = useState("");
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const pendingInputRef = useRef<HTMLInputElement>(null);
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
		if (!formProjectId) {
			setMembers([]);
			return;
		}
		setMembersLoading(true);
		listMembers(formProjectId)
			.then(setMembers)
			.catch(() => setMembers([]))
			.finally(() => setMembersLoading(false));
	}, [open, formProjectId]);

	useEffect(() => {
		if (!open) return;
		setTitleError("");
		setProjectError("");
		setCodeStatus("idle");
		setCodeMessage("");
		if (mode === "edit" && ticket) {
			setFormProjectId(ticket.project_id);
			setTitle(ticket.title);
			setDescription(ticket.description ?? "");
			setType(ticket.type);
			setPriority(ticket.priority);
			setStatus(ticket.status);
			setAssignedTo(ticket.assigned_to?.id ?? "");
			setDueDate(ticket.due_date ?? "");
			setTicketCode(ticket.ticket_code);
		} else {
			setFormProjectId(projectId);
			setTitle("");
			setDescription("");
			setType("bug");
			setPriority("medium");
			setStatus("open");
			setAssignedTo("");
			setDueDate("");
			setTicketCode("");
			setPendingFiles([]);
		}
	}, [open, mode, ticket, projectId]);

	useEffect(() => {
		if (!open || mode !== "create" || !formProjectId) return;
		setTicketCode("");
		getNextTicketCode(formProjectId)
			.then((code) => setTicketCode(code))
			.catch(() => {
				/* fallback: leave blank, server will autogen on submit */
			});
	}, [open, mode, formProjectId]);

	useEffect(() => {
		if (!open) return;
		if (!formProjectId) {
			setCodeStatus("idle");
			setCodeMessage("");
			return;
		}
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
					formProjectId,
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
	}, [ticketCode, open, mode, ticket, formProjectId]);

	async function handleSubmit() {
		if (mode === "create" && !formProjectId) {
			setProjectError("Project is required.");
			return;
		}
		if (!title.trim()) {
			setTitleError("Title is required.");
			return;
		}
		setSubmitting(true);
		setTitleError("");
		setProjectError("");
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
				const created = await createTicket(formProjectId, payload);
				toast.success("Ticket created.");
				if (pendingFiles.length > 0) {
					let uploadedCount = 0;
					let failedCount = 0;
					for (const file of pendingFiles) {
						try {
							await uploadTicketAttachment(
								formProjectId,
								created.id,
								file,
							);
							uploadedCount += 1;
						} catch {
							failedCount += 1;
						}
					}
					if (uploadedCount > 0) {
						toast.success(
							`${uploadedCount} attachment${uploadedCount !== 1 ? "s" : ""} uploaded.`,
						);
					}
					if (failedCount > 0) {
						toast.error(
							`${failedCount} attachment${failedCount !== 1 ? "s" : ""} failed to upload.`,
						);
					}
				}
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
				await updateTicket(formProjectId, ticket.id, payload);
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

	function openPendingPicker() {
		pendingInputRef.current?.click();
	}

	function handlePendingFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		const accepted: File[] = [];
		for (const f of Array.from(files)) {
			if (!ALLOWED_MIME.has(f.type)) {
				toast.error("Unsupported file type", { description: f.name });
				continue;
			}
			if (f.size > MAX_BYTES) {
				toast.error("File too large", {
					description: `${f.name} exceeds 50 MB`,
				});
				continue;
			}
			accepted.push(f);
		}
		if (accepted.length === 0) return;
		setPendingFiles((prev) => [...prev, ...accepted]);
		if (pendingInputRef.current) pendingInputRef.current.value = "";
	}

	function removePendingFile(index: number) {
		setPendingFiles((prev) => prev.filter((_, i) => i !== index));
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
					{mode === "create" && (
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Project <span className="text-danger">*</span>
							</label>
							<SearchableSelect
								value={formProjectId}
								onValueChange={(v) => {
									setFormProjectId(v);
									setProjectError("");
								}}
								placeholder="Select project..."
								options={projects.map<SearchableSelectOption>((p) => ({
									value: p.id,
									label: p.name,
								}))}
							/>
							{projectError && (
								<p className="text-xs text-danger mt-1">
									{projectError}
								</p>
							)}
						</div>
					)}

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

					{mode === "create" && (
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Attachments
							</label>
							<input
								ref={pendingInputRef}
								type="file"
								multiple
								accept={ACCEPT_ATTR}
								className="hidden"
								onChange={(e) =>
									handlePendingFiles(e.target.files)
								}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={openPendingPicker}
								className="gap-2"
							>
								<Paperclip className="h-4 w-4" />
								Add files
							</Button>
							{pendingFiles.length > 0 && (
								<ul className="mt-2 space-y-1.5">
									{pendingFiles.map((f, i) => (
										<li
											key={`${f.name}-${i}`}
											className="flex items-center gap-2 rounded-md border border-border bg-muted-subtle/40 px-2 py-1.5"
										>
											{isImage(f.type) ? (
												<img
													src={URL.createObjectURL(f)}
													alt={f.name}
													className="h-8 w-8 rounded object-cover"
													onLoad={(e) =>
														URL.revokeObjectURL(
															(e.target as HTMLImageElement).src,
														)
													}
												/>
											) : isVideo(f.type) ? (
												<Video className="h-8 w-8 text-muted-foreground" />
											) : (
												<FileText className="h-8 w-8 text-muted-foreground" />
											)}
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium text-foreground truncate">
													{f.name}
												</p>
												<p className="text-[10px] text-muted">
													{formatSize(f.size)}
												</p>
											</div>
											<button
												type="button"
												onClick={() =>
													removePendingFile(i)
												}
												aria-label={`Remove ${f.name}`}
												className="h-6 w-6 rounded-md text-muted-foreground hover:bg-muted-subtle hover:text-foreground flex items-center justify-center"
											>
												<X className="h-3.5 w-3.5" />
											</button>
										</li>
									))}
								</ul>
							)}
							<p className="mt-1.5 text-[10px] text-muted-foreground">
								Files upload after ticket is created. 50 MB max
								per file.
							</p>
						</div>
					)}

					{mode === "edit" && ticket && (
						<div>
							<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
								Attachments
							</label>
							<TicketAttachments
								projectId={ticket.project_id}
								ticketId={ticket.id}
								canEdit={true}
							/>
						</div>
					)}
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
							(mode === "create" && !formProjectId) ||
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
