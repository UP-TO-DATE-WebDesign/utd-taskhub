import type { WorkflowStage } from "@/services/workflow-stage.service";

function makeSystemStage(
	key: string,
	name: string,
	color: string,
	position: number,
): WorkflowStage {
	return {
		id: `system-${key}`,
		project_id: "",
		key,
		name,
		color,
		position,
		is_system: true,
	};
}

export const SYSTEM_STAGES: WorkflowStage[] = [
	makeSystemStage("backlog", "Backlog", "#64748b", 0),
	makeSystemStage("todo", "To Do", "#0058be", 1),
	makeSystemStage("in-progress", "In Progress", "#f59e0b", 2),
	makeSystemStage("qa", "QA", "#7c3aed", 3),
	makeSystemStage("done", "Done", "#006c49", 4),
	makeSystemStage("cancelled", "Cancelled", "#94a3b8", 5),
];
