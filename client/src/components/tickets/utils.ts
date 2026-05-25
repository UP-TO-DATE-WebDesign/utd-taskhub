import type {
	TicketType,
	TicketStatus,
	TicketPriority,
} from "@/services/ticket.service";
import type { BadgeVariant } from "./types";

export function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function priorityVariant(p: TicketPriority): BadgeVariant {
	return p as BadgeVariant;
}

export function statusVariant(s: TicketStatus): BadgeVariant {
	const map: Record<TicketStatus, BadgeVariant> = {
		open: "open",
		in_review: "review",
		resolved: "done",
		closed: "cancelled",
		cancelled: "cancelled",
	};
	return map[s];
}

export function typeVariant(t: TicketType): BadgeVariant {
	const map: Record<TicketType, BadgeVariant> = {
		bug: "urgent",
		feature_request: "medium",
		issue: "high",
		support: "accent",
		other: "default",
	};
	return map[t];
}

export function typeLabel(t: TicketType): string {
	const map: Record<TicketType, string> = {
		bug: "Bug",
		feature_request: "Feature Request",
		issue: "Issue",
		support: "Support",
		other: "Other",
	};
	return map[t];
}

export function statusLabel(s: TicketStatus): string {
	const map: Record<TicketStatus, string> = {
		open: "Open",
		in_review: "In Review",
		resolved: "Resolved",
		closed: "Closed",
		cancelled: "Cancelled",
	};
	return map[s];
}
