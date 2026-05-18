import type { UiTask } from "@/components/tasks/types";
import type { StartSprintTaskAction } from "@/services/sprint.service";
import type { StartTaskActionMap } from "./types";

export function defaultStartActions(tasks: UiTask[]): StartTaskActionMap {
	const map: StartTaskActionMap = {};
	for (const t of tasks) map[t.id] = { kind: "move" };
	return map;
}

export function summarizeStartActions(actions: StartTaskActionMap): {
	total: number;
	move: number;
	keep: number;
} {
	const values = Object.values(actions);
	const move = values.filter((a) => a.kind === "move").length;
	return { total: values.length, move, keep: values.length - move };
}

export function toStartPayload(
	actions: StartTaskActionMap,
): StartSprintTaskAction[] {
	return Object.entries(actions).map(([taskId, state]) => ({
		taskId,
		action: state.kind,
	}));
}
