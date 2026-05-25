import type {
	TicketType,
	TicketStatus,
	TicketPriority,
} from "@/services/ticket.service";

export type BadgeVariant =
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

export interface Filters {
	status: TicketStatus | "";
	type: TicketType | "";
	priority: TicketPriority | "";
}
