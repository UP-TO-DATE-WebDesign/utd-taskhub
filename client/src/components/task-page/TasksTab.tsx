import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Task, type ApiTaskPriority } from "@/services/task.service";
import type { WorkflowStage } from "@/services/workflow-stage.service";
import {
	profileColorClass,
	toUiTask,
	getStage,
	type UiTask,
} from "@/components/tasks/types";
import { StageChip } from "@/components/tasks/StageChip";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { getInitials, formatDate } from "./utils";

const TASK_PRIORITY_BADGE: Record<
	ApiTaskPriority,
	{ variant: "low" | "medium" | "high" | "urgent"; label: string }
> = {
	low: { variant: "low", label: "Low" },
	medium: { variant: "medium", label: "Medium" },
	high: { variant: "high", label: "High" },
	urgent: { variant: "urgent", label: "Urgent" },
};

export function TasksTab({
	tasks,
	tasksLoading,
	stages,
	onViewTask,
}: {
	tasks: Task[];
	tasksLoading: boolean;
	stages?: WorkflowStage[];
	onViewTask: (task: UiTask | null) => void;
}) {
	return (
		<Card className="p-0 overflow-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border bg-muted-subtle/40">
						{[
							"Title",
							"Status",
							"Priority",
							"Assigned To",
							"Due Date",
						].map((h) => (
							<th
								key={h}
								className="px-5 py-3 text-xs font-medium text-muted text-left"
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{tasksLoading ? (
						<tr>
							<td colSpan={5} className="px-5 py-10 text-center">
								<div className="flex items-center justify-center gap-2 text-muted">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="text-sm">
										Loading tasks...
									</span>
								</div>
							</td>
						</tr>
					) : tasks.length === 0 ? (
						<tr>
							<td
								colSpan={5}
								className="px-5 py-10 text-center text-sm text-muted"
							>
								No tasks yet. Click "New Task" to create one.
							</td>
						</tr>
					) : (
						tasks.map((task) => {
							const stage = getStage(task.status, stages);
							const priorityInfo =
								TASK_PRIORITY_BADGE[task.priority];
							const assignee = task.assigned_to ?? null;
							const description = projectDescriptionText(
								task.description,
							);
							return (
								<tr
									key={task.id}
									className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors"
									onClick={() => {
										onViewTask(toUiTask(task));
									}}
								>
									<td className="px-5 py-4">
										<p className="text-sm font-medium text-foreground">
											{task.title}
										</p>
										{description && (
											<p className="text[11px] text-muted mt-0.5 truncate max-w-xs">
												{description}
											</p>
										)}
									</td>
									<td className="px-5 py-4">
										<StageChip
											label={stage?.name ?? task.status}
											color={stage?.color ?? "#64748b"}
										/>
									</td>
									<td className="px-5 py-4">
										<Badge variant={priorityInfo.variant}>
											{priorityInfo.label}
										</Badge>
									</td>
									<td className="px-5 py-4">
										{assignee ? (
											<div className="flex items-center gap-2">
												<Avatar className="h-6 w-6 shrink-0">
													<AvatarImage
														src={
															assignee.avatar_url ??
															undefined
														}
														alt={
															assignee.full_name ??
															""
														}
													/>
													<AvatarFallback
														className={`text-[9px] text-white ${profileColorClass(assignee.id)}`}
													>
														{getInitials(
															assignee.full_name,
														)}
													</AvatarFallback>
												</Avatar>
												<span className="text-sm text-foreground">
													{assignee.full_name ??
														assignee.email}
												</span>
											</div>
										) : (
											<span className="text-sm text-muted">
												Unassigned
											</span>
										)}
									</td>
									<td className="px-5 py-4 text-sm text-muted whitespace-nowrap">
										{formatDate(task.due_date)}
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</Card>
	);
}
