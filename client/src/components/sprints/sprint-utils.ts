import { format } from "date-fns";
import type { SprintStatus } from "@/services/sprint.service";

export const STATUS_BADGE: Record<
	SprintStatus,
	{ variant: "todo" | "in-progress" | "done"; label: string }
> = {
	planned: { variant: "todo", label: "Planned" },
	active: { variant: "in-progress", label: "Active" },
	completed: { variant: "done", label: "Completed" },
};

export function formatSprintRange(start: string, end: string): string {
	const s = new Date(start + "T00:00:00");
	const e = new Date(end + "T00:00:00");
	if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
		return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
	}
	return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}
