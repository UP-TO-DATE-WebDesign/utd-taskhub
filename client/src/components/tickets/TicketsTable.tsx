import { Card } from "@/components/ui/card";
import type { Ticket } from "@/services/ticket.service";
import { TicketRow } from "./TicketRow";

interface TicketsTableProps {
	tickets: Ticket[];
	deletingId: string | null;
	canConvert: boolean;
	canEditTicket: (t: Ticket) => boolean;
	canDeleteTicket: (t: Ticket) => boolean;
	onEdit: (t: Ticket) => void;
	onConvert: (t: Ticket) => void;
	onDelete: (t: Ticket) => void;
	onClose: (t: Ticket) => void;
}

export function TicketsTable({
	tickets,
	deletingId,
	canConvert,
	canEditTicket,
	canDeleteTicket,
	onEdit,
	onConvert,
	onDelete,
	onClose,
}: TicketsTableProps) {
	return (
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
								onEdit={onEdit}
								onConvert={onConvert}
								onDelete={onDelete}
								onClose={onClose}
							/>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
