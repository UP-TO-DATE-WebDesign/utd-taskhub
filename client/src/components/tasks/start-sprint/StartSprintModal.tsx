import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UiTask } from "@/components/tasks/types";
import {
	startSprint,
	type Sprint,
	type StartSprintResponse,
} from "@/services/sprint.service";
import { StartSprintTaskRow } from "./StartSprintTaskRow";
import {
	defaultStartActions,
	summarizeStartActions,
	toStartPayload,
} from "./helpers";
import type { StartTaskActionMap, StartTaskActionState } from "./types";

interface Props {
	open: boolean;
	onClose: () => void;
	sprint: Sprint;
	candidateTasks: UiTask[];
	onStarted: (result: StartSprintResponse) => void;
}

function formatSprintRange(start: string, end: string): string {
	const s = new Date(start + "T00:00:00");
	const e = new Date(end + "T00:00:00");
	if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
		return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
	}
	return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

export function StartSprintModal({
	open,
	onClose,
	sprint,
	candidateTasks,
	onStarted,
}: Props) {
	const [actions, setActions] = useState<StartTaskActionMap>(() =>
		defaultStartActions(candidateTasks),
	);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) {
			setActions(defaultStartActions(candidateTasks));
			setSubmitting(false);
		}
	}, [open, candidateTasks]);

	const summary = useMemo(() => summarizeStartActions(actions), [actions]);

	function updateAction(taskId: string, next: StartTaskActionState) {
		setActions((prev) => ({ ...prev, [taskId]: next }));
	}

	async function handleConfirm() {
		if (submitting) return;
		setSubmitting(true);
		try {
			const result = await startSprint(sprint.id, {
				taskActions: toStartPayload(actions),
			});
			toast.success("Sprint started", { description: sprint.name });
			onStarted(result);
			onClose();
		} catch (e) {
			toast.error("Failed to start sprint", {
				description: (e as Error).message || "Please try again.",
			});
			setSubmitting(false);
		}
	}

	function handleOpenChange(next: boolean) {
		if (submitting) return;
		if (!next) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Start Sprint: {sprint.name}</DialogTitle>
					<DialogDescription>
						Choose which tasks to pull into this sprint.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-border bg-muted-subtle/40 px-4 py-3 mb-4 flex items-center gap-3">
					<Calendar className="h-4 w-4 text-muted" />
					<div className="flex-1 text-sm text-foreground">
						{formatSprintRange(sprint.start_date, sprint.end_date)}
					</div>
					<Badge variant="todo">Planned</Badge>
				</div>

				<div className="flex flex-wrap items-center gap-2 mb-4">
					<Badge variant="todo">Total {summary.total}</Badge>
					<Badge variant="in-progress">Will move {summary.move}</Badge>
					<Badge variant="done">Will keep {summary.keep}</Badge>
				</div>

				{candidateTasks.length === 0 ? (
					<div className="rounded-lg border border-border bg-muted-subtle/40 px-4 py-8 text-center">
						<p className="text-sm font-medium text-foreground">
							No candidate tasks
						</p>
						<p className="text-xs text-muted mt-1">
							You can start this sprint without moving any tasks.
						</p>
					</div>
				) : (
					<div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border px-4">
						{candidateTasks.map((task) => (
							<StartSprintTaskRow
								key={task.id}
								task={task}
								value={actions[task.id] ?? { kind: "move" }}
								onChange={(next) => updateAction(task.id, next)}
								disabled={submitting}
							/>
						))}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						disabled={submitting}
					>
						Cancel
					</Button>
					<Button onClick={handleConfirm} disabled={submitting}>
						{submitting && (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						)}
						Start Sprint
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
