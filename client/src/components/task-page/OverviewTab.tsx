import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/services/project.service";
import type { Task } from "@/services/task.service";
import type { Sprint } from "@/services/sprint.service";
import { TeamAvatars } from "./TeamAvatars";
import { getInitials, avatarColor, formatDate } from "./utils";

export function OverviewTab({
	project,
	tasks,
	allSprints,
	assigningSprintId,
	onAssignSprint,
}: {
	project: Project;
	tasks: Task[];
	allSprints: Sprint[];
	assigningSprintId: boolean;
	onAssignSprint: (sprintId: string | null) => void;
}) {
	const members = project.project_members ?? [];
	const doneCount = tasks.filter((t) => t.status === "done").length;
	const pct =
		tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
	const sprintBlocks = 4;
	const filledBlocks = Math.round((pct / 100) * sprintBlocks);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-[280px_1fr] gap-4">
				{/* Completion Progress */}
				<Card className="p-5">
					<p className="text-[10px] font-medium uppercase tracking-widest text-muted mb-4">
						Completion Progress
					</p>
					<p className="text-4xl font-bold text-primary mb-1">
						{pct}%
					</p>
					<p className="text-xs text-muted mb-3">
						{doneCount} / {tasks.length} Tasks
					</p>
					<div className="h-1.5 w-full bg-border rounded-full overflow-hidden mb-4">
						<div
							className="h-full bg-primary rounded-full transition-all"
							style={{ width: `${pct}%` }}
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="rounded-lg bg-muted-subtle px-3 py-2">
							<p className="text-[10px] text-muted mb-0.5">
								Completed
							</p>
							<p className="text-lg font-bold text-foreground">
								{doneCount}
							</p>
						</div>
						<div className="rounded-lg bg-muted-subtle px-3 py-2">
							<p className="text-[10px] text-muted mb-0.5">
								Remaining
							</p>
							<p className="text-lg font-bold text-foreground">
								{tasks.length - doneCount}
							</p>
						</div>
					</div>
				</Card>

				{/* Current Sprint */}
				<Card className="p-5">
					<div className="flex items-start justify-between mb-4">
						<div className="flex-1 min-w-0">
							<p className="text-[10px] font-medium uppercase tracking-widest text-muted mb-2">
								Current Sprint
							</p>
							<h2 className="text-2xl font-bold text-foreground mb-2">
								{project.sprint?.name || "No sprint"}
							</h2>
							{project.sprint && (
								<p className="text-sm text-muted mt-0.5">
									Ends {formatDate(project.sprint.end_date)}
								</p>
							)}
							<div className="mt-3">
								<Select
									value={project.sprint_id ?? "__none__"}
									onValueChange={(v) =>
										onAssignSprint(
											v === "__none__" ? null : v,
										)
									}
									disabled={assigningSprintId}
								>
									<SelectTrigger className="h-8 text-xs w-48">
										<SelectValue placeholder="Assign to sprint" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none__">
											No sprint
										</SelectItem>
										{allSprints.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<TeamAvatars members={members} />
					</div>

					<div className="flex items-center gap-2 mb-4">
						<TrendingUp className="h-4 w-4 text-primary" />
						<p className="text-sm text-foreground">
							<span className="font-semibold">
								{members.length}
							</span>{" "}
							team member{members.length !== 1 ? "s" : ""}
						</p>
					</div>

					<div className="flex gap-2">
						{Array.from({ length: sprintBlocks }).map((_, i) => (
							<div
								key={i}
								className={`h-2 flex-1 rounded-full ${i < filledBlocks ? "bg-primary" : "bg-border"}`}
							/>
						))}
					</div>
				</Card>
			</div>

			{/* Tags + Team */}
			<div className="grid grid-cols-[1fr_320px] gap-4">
				<Card className="p-5">
					<h2 className="text-base font-semibold text-foreground mb-4">
						Tags
					</h2>
					{project.tags.length === 0 ? (
						<p className="text-sm text-muted">No tags.</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{project.tags.map((tag) => (
								<span
									key={tag}
									className="text-sm bg-muted-subtle text-muted-foreground px-3 py-1 rounded-full font-medium"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</Card>

				<Card className="p-5">
					<h2 className="text-base font-semibold text-foreground mb-4">
						Team
					</h2>
					{members.length === 0 ? (
						<p className="text-sm text-muted">No members yet.</p>
					) : (
						<div className="space-y-3">
							{members.map((m, i) => (
								<div
									key={m.user_id}
									className="flex items-center gap-3"
								>
									<Avatar className="h-8 w-8 shrink-0">
										<AvatarImage
											src={
												m.profiles?.avatar_url ??
												undefined
											}
											alt={m.profiles?.full_name ?? ""}
										/>
										<AvatarFallback
											className={`text-[10px] text-white ${avatarColor(String(m.profiles?.id)?.length)}`}
										>
											{getInitials(
												m.profiles?.full_name ?? null,
											)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-foreground truncate">
											{m.profiles?.full_name ?? "Unknown"}
										</p>
										<p className="text-xs text-muted capitalize">
											{m.role}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
