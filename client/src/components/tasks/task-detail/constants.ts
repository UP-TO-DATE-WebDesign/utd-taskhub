import {
	type ApiTaskStatus,
	type ApiTaskPriority,
} from "@/services/task.service";

export const STATUS_OPTIONS: ApiTaskStatus[] = [
	"backlog",
	"todo",
	"in_progress",
	"review",
	"done",
	"cancelled",
];

export const PRIORITY_OPTIONS: ApiTaskPriority[] = [
	"urgent",
	"high",
	"medium",
	"low",
];

export const PRIORITY_LABEL: Record<ApiTaskPriority, string> = {
	low: "LOW PRIORITY",
	medium: "MEDIUM PRIORITY",
	high: "HIGH PRIORITY",
	urgent: "URGENT",
};

export const PRIORITY_CHIP: Record<ApiTaskPriority, string> = {
	low: "bg-slate-100 text-slate-700",
	medium: "bg-primary/10 text-primary",
	high: "bg-orange-100 text-orange-700",
	urgent: "bg-red-100 text-red-700",
};

export const UNASSIGNED_VALUE = "__unassigned__";
