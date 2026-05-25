import {
	Loader2,
	MoreHorizontal,
	ArrowRightCircle,
	Pencil,
	Trash2,
	CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ticket } from "@/services/ticket.service";
import {
	formatDate,
	getInitials,
	priorityVariant,
	statusVariant,
	typeVariant,
	typeLabel,
	statusLabel,
} from "./utils";

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

export function TicketRow({
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
