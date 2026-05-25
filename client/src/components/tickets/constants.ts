import type {
	TicketType,
	TicketStatus,
	TicketPriority,
} from "@/services/ticket.service";

export const TICKET_TYPES: TicketType[] = [
	"bug",
	"feature_request",
	"issue",
	"support",
	"other",
];

export const TICKET_STATUSES: TicketStatus[] = [
	"open",
	"in_review",
	"resolved",
	"closed",
	"cancelled",
];

export const TICKET_PRIORITIES: TicketPriority[] = [
	"low",
	"medium",
	"high",
	"urgent",
];

export const TASK_STATUSES = [
	"backlog",
	"todo",
	"in_progress",
	"review",
	"done",
	"cancelled",
] as const;
