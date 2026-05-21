import { Calendar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon-picker";
import { cn } from "@/lib/utils";
import { type Project } from "@/services/project.service";
import {
	type UiTask,
	STATUS_BADGE,
	getInitials,
	profileColorClass,
} from "./types";

const TABLE_HEADERS = ["Type", "Task", "Project", "Priority", "Status", "Assignee", "Sprint", "Due"];

function ListRow({
	task,
	projects,
	onView,
}: {
	task: UiTask;
	projects: Project[];
	onView: (task: UiTask) => void;
}) {
	const projectName =
		projects.find((p) => p.id === task.project_id)?.name ?? "—";
	const assignee = task.assigned_to;
	const statusInfo = STATUS_BADGE[task.apiStatus];

	return (
		<tr
			className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors cursor-pointer"
			onClick={() => onView(task)}
		>
			<td className="px-5 py-3.5">
				{task.task_type ? (
					<span
						className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
						style={{
							background: `${task.task_type.color}1a`,
							color: task.task_type.color,
						}}
						title={task.task_type.name}
					>
						<Icon
							name={task.task_type.icon as IconName}
							className="h-3 w-3"
						/>
						{task.task_type.name}
					</span>
				) : (
					<span className="text-xs text-muted">—</span>
				)}
			</td>
			<td className="px-4 py-3.5">
				<p className="text-sm font-medium text-foreground">{task.title}</p>
				{task.tags[0] && (
					<span className="text-[10px] text-muted">{task.tags[0]}</span>
				)}
			</td>
			<td className="px-4 py-3.5">
				<span className="text-xs text-muted-foreground">{projectName}</span>
			</td>
			<td className="px-4 py-3.5">
				<Badge variant={task.priority}>
					{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
				</Badge>
			</td>
			<td className="px-4 py-3.5">
				<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
			</td>
			<td className="px-4 py-3.5">
				{assignee && (
					<div className="flex items-center gap-2">
						<Avatar className="h-6 w-6">
							{assignee.avatar_url && (
								<AvatarImage
									src={assignee.avatar_url}
									alt={assignee.full_name ?? assignee.email}
								/>
							)}
							<AvatarFallback
								className={`text-[9px] text-white ${profileColorClass(assignee.id)}`}
							>
								{getInitials(assignee.full_name ?? assignee.email)}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-muted-foreground">
							{assignee.full_name ?? assignee.email}
						</span>
					</div>
				)}
			</td>
			<td className="px-4 py-3.5">
				{task.sprint ? (
					<span className="text-xs text-muted-foreground">{task.sprint.name}</span>
				) : (
					<span className="text-xs text-muted">—</span>
				)}
			</td>
			<td className="px-4 py-3.5">
				<div className="flex items-center gap-1 text-xs text-muted">
					<Calendar className="h-3 w-3" />
					{task.due_date ? task.due_date.slice(0, 10) : "—"}
				</div>
			</td>
		</tr>
	);
}

export function TaskTable({
	tasks,
	projects,
	onView,
}: {
	tasks: UiTask[];
	projects: Project[];
	onView: (task: UiTask) => void;
}) {
	if (tasks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<Search className="h-8 w-8 text-border-strong mb-3" />
				<p className="text-sm font-medium text-foreground mb-1">No tasks found</p>
				<p className="text-xs text-muted">Try adjusting your filters.</p>
			</div>
		);
	}

	return (
		<Card className="p-0 overflow-hidden">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border bg-muted-subtle/40">
						{TABLE_HEADERS.map((h, i) => (
							<th
								key={h}
								className={cn(
									"px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted",
									i === 0 ? "pl-5 text-left" : "text-left",
								)}
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{tasks.map((task) => (
						<ListRow
							key={task.id}
							task={task}
							projects={projects}
							onView={onView}
						/>
					))}
				</tbody>
			</table>
		</Card>
	);
}
