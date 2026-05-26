import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getTicket, type Ticket } from "@/services/ticket.service";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";
import {
	priorityVariant,
	statusVariant,
	typeVariant,
	typeLabel,
	statusLabel,
	formatDate,
	getInitials,
} from "@/components/tickets/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";

export default function TicketDetailPage() {
	const { projectId, ticketId } = useParams<{
		projectId: string;
		ticketId: string;
	}>();
	const { user } = useAuth();
	const { can, roleKey } = usePermission();
	const [ticket, setTicket] = useState<Ticket | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!projectId || !ticketId) return;
		setLoading(true);
		setError(null);
		getTicket(projectId, ticketId)
			.then(setTicket)
			.catch((e: unknown) => {
				setError(
					e instanceof Error ? e.message : "Failed to load ticket.",
				);
			})
			.finally(() => setLoading(false));
	}, [projectId, ticketId]);

	function canEditAttachments(t: Ticket): boolean {
		if (roleKey === "user") return t.created_by.id === user?.id;
		return can("Edit tickets");
	}

	if (loading) {
		return (
			<div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 flex items-center justify-center min-h-[60vh]">
				<Loader2 className="h-6 w-6 animate-spin text-muted" />
			</div>
		);
	}

	if (error || !ticket) {
		return (
			<div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
				<Link to="/tickets">
					<Button variant="outline" size="sm" className="gap-2 mb-6">
						<ArrowLeft className="h-4 w-4" />
						Back to tickets
					</Button>
				</Link>
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-base font-medium text-foreground mb-1">
						{error ? "Something went wrong" : "Ticket not found"}
					</p>
					{error && (
						<p className="text-sm text-muted">{error}</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
			<Link to="/tickets">
				<Button variant="outline" size="sm" className="gap-2 mb-6">
					<ArrowLeft className="h-4 w-4" />
					Back to tickets
				</Button>
			</Link>

			<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
				<div className="space-y-6">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs font-mono font-semibold text-muted-foreground bg-muted-subtle px-2 py-0.5 rounded">
								{ticket.ticket_code}
							</span>
							<Badge variant={typeVariant(ticket.type)}>
								{typeLabel(ticket.type)}
							</Badge>
							<Badge variant={statusVariant(ticket.status)}>
								{statusLabel(ticket.status)}
							</Badge>
							<Badge
								variant={priorityVariant(ticket.priority)}
								className="capitalize"
							>
								{ticket.priority}
							</Badge>
						</div>
						<h1 className="text-2xl font-semibold text-foreground tracking-tight">
							{ticket.title}
						</h1>
					</div>

					{ticket.description && (
						<Card className="p-5">
							<h2 className="text-sm font-semibold text-foreground mb-2">
								Description
							</h2>
							<p className="text-sm text-foreground whitespace-pre-wrap">
								{ticket.description}
							</p>
						</Card>
					)}

					<Card className="p-5">
						<h2 className="text-sm font-semibold text-foreground mb-3">
							Attachments
						</h2>
						<TicketAttachments
							projectId={ticket.project_id}
							ticketId={ticket.id}
							canEdit={canEditAttachments(ticket)}
						/>
					</Card>

					{ticket.resolution && (
						<Card className="p-5">
							<h2 className="text-sm font-semibold text-foreground mb-2">
								Resolution
							</h2>
							<p className="text-sm text-foreground whitespace-pre-wrap">
								{ticket.resolution}
							</p>
						</Card>
					)}
				</div>

				<aside className="space-y-4">
					<Card className="p-5 space-y-4">
						<MetaRow label="Assigned To">
							{ticket.assigned_to ? (
								<div className="flex items-center gap-2">
									<Avatar className="h-6 w-6">
										<AvatarFallback className="text-[9px]">
											{getInitials(
												ticket.assigned_to.full_name,
											)}
										</AvatarFallback>
									</Avatar>
									<span className="text-xs text-foreground">
										{ticket.assigned_to.full_name ??
											ticket.assigned_to.email}
									</span>
								</div>
							) : (
								<span className="text-xs text-muted">
									Unassigned
								</span>
							)}
						</MetaRow>
						<MetaRow label="Created By">
							<div className="flex items-center gap-2">
								<Avatar className="h-6 w-6">
									<AvatarFallback className="text-[9px]">
										{getInitials(ticket.created_by.full_name)}
									</AvatarFallback>
								</Avatar>
								<span className="text-xs text-foreground">
									{ticket.created_by.full_name ??
										ticket.created_by.email}
								</span>
							</div>
						</MetaRow>
						<MetaRow label="Due Date">
							<span className="text-xs text-foreground">
								{ticket.due_date
									? formatDate(ticket.due_date)
									: "—"}
							</span>
						</MetaRow>
						<MetaRow label="Created">
							<span className="text-xs text-foreground">
								{formatDate(ticket.created_at)}
							</span>
						</MetaRow>
						{ticket.closed_at && (
							<MetaRow label="Closed">
								<span className="text-xs text-foreground">
									{formatDate(ticket.closed_at)}
								</span>
							</MetaRow>
						)}
					</Card>
				</aside>
			</div>
		</div>
	);
}

function MetaRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1">
				{label}
			</p>
			{children}
		</div>
	);
}
