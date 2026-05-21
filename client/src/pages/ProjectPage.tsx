import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	getProject,
	updateProject,
	type Project,
} from "@/services/project.service";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { toast } from "sonner";
import { listProfiles, type Profile } from "@/services/profile.service";
import {
	listTasks,
	updateTask,
	createTask,
	type ApiTaskStatus,
	type Task,
	type UpdateTaskPayload,
	type CreateTaskPayload,
} from "@/services/task.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ProjectDescriptionPreview } from "@/components/projects/project-description";
import { GeneralSection as ProjectGeneralSection } from "@/components/project-settings/GeneralSection";
import { ProjectActivityFeed } from "@/components/projects/ProjectActivityFeed";
import { ProjectPageSkeleton } from "@/components/projects/ProjectPageSkeleton";
import { DangerZoneSection as ProjectDangerZoneSection } from "@/components/project-settings/DangerZoneSection";
import { EditProjectDialog } from "@/components/task-page/EditProjectDialog";
import { NewTaskDialogV2 } from "@/components/tasks/NewTaskDialogV2";
import { AddMemberDialog } from "@/components/task-page/AddMemberDialog";
import { OverviewTab } from "@/components/task-page/OverviewTab";
import { TasksTab } from "@/components/task-page/TasksTab";
import { ProjectTaskFilters } from "@/components/task-page/ProjectTaskFilters";
import { TeamsTab } from "@/components/task-page/TeamsTab";
import { WorkflowStagesTab } from "@/components/task-page/WorkflowStagesTab";
import { TaskDetailDialogV2 } from "@/components/tasks/TaskDetailDialogV2";
import { COLUMN_LABELS, toUiTask, type UiTask } from "@/components/tasks/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
	"in-progress": { variant: "in-progress" as const, label: "In Progress" },
	planning: { variant: "todo" as const, label: "Planning" },
	completed: { variant: "done" as const, label: "Completed" },
	"on-hold": { variant: "cancelled" as const, label: "On Hold" },
};

const TABS = [
	"Overview",
	"Tasks",
	"Teams",
	"Workflow Stages",
	"Activity",
	"Settings",
] as const;
type Tab = (typeof TABS)[number];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [activeTab, setActiveTab] = useState<Tab>("Overview");
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [allSprints, setAllSprints] = useState<Sprint[]>([]);
	const [loading, setLoading] = useState(true);
	const [tasksLoading, setTasksLoading] = useState(true);
	const [error, setError] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [newTaskOpen, setNewTaskOpen] = useState(false);
	const [addUserOpen, setAddUserOpen] = useState(false);
	const [assigningSprintId, setAssigningSprintId] = useState(false);

	// const [dialogOpen, setDialogOpen] = useState(false);
	// const [childParent, setChildParent] = useState<UiTask | null>(null);
	const [viewTask, setViewTask] = useState<UiTask | null>(null);

	const [search, setSearch] = useState("");
	const [filterSprint, setFilterSprint] = useState("all");
	const [filterUser, setFilterUser] = useState("all");

	const filteredTasks = useMemo(() => {
		const lc = search.toLowerCase();
		return tasks.filter((t) => {
			if (filterSprint !== "all" && t.sprint?.id !== filterSprint)
				return false;
			if (filterUser !== "all" && t.assigned_to?.id !== filterUser)
				return false;
			if (search && !t.title.toLowerCase().includes(lc)) return false;
			return true;
		});
	}, [tasks, filterSprint, filterUser, search]);

	const isFiltered =
		filterSprint !== "all" || filterUser !== "all" || search.length > 0;

	const handleClearFilters = () => {
		setSearch("");
		setFilterSprint("all");
		setFilterUser("all");
	};

	useEffect(() => {
		if (!id) return;
		setLoading(true);
		setTasksLoading(true);

		Promise.all([
			getProject(id),
			listTasks(id),
			listProfiles(),
			listSprints(),
		])
			.then(async ([proj, taskList, profileList, sprintList]) => {
				setProfiles(profileList);
				setAllSprints(sprintList);
				setTasks(taskList);

				if (!proj.sprint_id) {
					const active = sprintList.find(
						(s) => s.status === "active",
					);
					if (active) {
						try {
							const updated = await updateProject(proj.id, {
								sprint_id: active.id,
							});
							setProject({
								...proj,
								sprint_id: updated.sprint_id,
								sprint: updated.sprint,
							});
							return;
						} catch {
							// fall through to set unassigned project
						}
					}
				}

				setProject(proj);
			})
			.catch(() => setError(true))
			.finally(() => {
				setLoading(false);
				setTasksLoading(false);
			});
	}, [id]);

	async function handleAssignSprint(sprintId: string | null) {
		if (!id || !project) return;
		setAssigningSprintId(true);
		try {
			const updated = await updateProject(id, { sprint_id: sprintId });
			setProject((prev) =>
				prev
					? {
							...prev,
							sprint_id: updated.sprint_id,
							sprint: updated.sprint,
						}
					: prev,
			);
			toast.success(
				sprintId ? "Project assigned to sprint." : "Sprint removed.",
			);
		} catch {
			toast.error("Failed to update sprint assignment.");
		} finally {
			setAssigningSprintId(false);
		}
	}
	const handleSaveNotes = useCallback(async (task: UiTask, notes: string) => {
		const apiTask = await updateTask(task.project_id, task.id, {
			developer_notes: notes,
		});
		setTasks((prev) => {
			return prev.map((t) => (t.id === apiTask.id ? apiTask : t));
		});
		setViewTask(toUiTask(apiTask));
		toast.success("Notes saved");
	}, []);

	const handleEditTask = useCallback(
		async (task: UiTask, payload: UpdateTaskPayload) => {
			const apiTask = await updateTask(task.project_id, task.id, payload);
			setTasks((prev) => {
				return prev.map((t) => (t.id === apiTask.id ? apiTask : t));
			});
			setViewTask(toUiTask(apiTask));
			toast.success("Task updated", { description: apiTask.title });
		},
		[],
	);

	const handleChangeStatus = useCallback(
		async (task: UiTask, status: ApiTaskStatus) => {
			const apiTask = await updateTask(task.project_id, task.id, {
				status,
			});
			setTasks((prev) => {
				return prev.map((t) => (t.id === apiTask.id ? apiTask : t));
			});
			setViewTask(toUiTask(apiTask));
			toast.success("Status updated", {
				description:
					COLUMN_LABELS[
						status.replace("_", "-") as keyof typeof COLUMN_LABELS
					],
			});
		},
		[],
	);

	if (loading) {
		return <ProjectPageSkeleton />;
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-[1280px] px-6 py-16 text-center">
				<p className="text-base font-medium text-foreground mb-2">
					Project not found
				</p>
				<Button variant="outline" onClick={() => navigate("/projects")}>
					Back to Projects
				</Button>
			</div>
		);
	}

	const { variant: statusVariant, label: statusLabel } =
		STATUS_BADGE[project.status];
	const members = project.project_members ?? [];
	const myMembership = members.find((m) => m.user_id === user?.id);
	const canEditProject =
		user?.global_role?.key === "admin" ||
		myMembership?.role === "owner" ||
		myMembership?.role === "manager";

	return (
		<div className="mx-auto max-w-[1280px] px-6 py-8">
			{/* Back */}
			<button
				onClick={() => navigate("/projects")}
				className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
			>
				<ArrowLeft className="h-3.5 w-3.5" />
				Projects
			</button>

			{/* Header */}
			<div className="flex items-start justify-between gap-6 mb-6">
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-semibold text-foreground tracking-tight">
							{project.name}
						</h1>
						<Badge variant={statusVariant}>{statusLabel}</Badge>
					</div>
					<ProjectDescriptionPreview
						value={project.description}
						className="text-sm text-muted leading-relaxed max-w-2xl"
					/>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{canEditProject && (
						<Button
							variant="outline"
							className="flex items-center gap-2"
							onClick={() => setEditOpen(true)}
						>
							<Pencil className="h-3.5 w-3.5" />
							Edit Project
						</Button>
					)}
					<Button
						className="flex items-center gap-2"
						onClick={() => setNewTaskOpen(true)}
					>
						<Plus className="h-4 w-4" />
						New Task
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex flex-wrap items-center gap-0 border-b border-border mb-8">
				{TABS.map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={cn(
							"px-4 py-2.5 text-sm transition-colors -mb-px border-b-2",
							activeTab === tab
								? "text-primary font-medium border-primary"
								: "text-muted-foreground hover:text-foreground border-transparent",
						)}
					>
						{tab}
					</button>
				))}
			</div>

			{/* ── OVERVIEW TAB ─────────────────────────────────────── */}
			{activeTab === "Overview" && (
				<OverviewTab
					project={project}
					tasks={tasks}
					allSprints={allSprints}
					assigningSprintId={assigningSprintId}
					onAssignSprint={handleAssignSprint}
				/>
			)}

			{/* ── TASKS TAB ────────────────────────────────────────── */}
			{activeTab === "Tasks" && (
				<>
					<ProjectTaskFilters
						search={search}
						filterSprint={filterSprint}
						filterUser={filterUser}
						sprints={allSprints}
						sprintsLoading={tasksLoading}
						members={members}
						isFiltered={isFiltered}
						onSearchChange={setSearch}
						onFilterSprintChange={setFilterSprint}
						onFilterUserChange={setFilterUser}
						onClearFilters={handleClearFilters}
					/>
					<TasksTab
						tasks={filteredTasks}
						tasksLoading={tasksLoading}
						onViewTask={(task) => setViewTask(task)}
					/>
				</>
			)}

			{/* ── TEAMS TAB ────────────────────────────────────────── */}
			{activeTab === "Teams" && (
				<TeamsTab
					project={project}
					members={members}
					onAddMemberClick={() => setAddUserOpen(true)}
					onMemberRemoved={(userId) =>
						setProject((prev) =>
							prev
								? {
										...prev,
										project_members:
											prev.project_members.filter(
												(m) => m.user_id !== userId,
											),
									}
								: prev,
						)
					}
				/>
			)}

			{/* ── WORKFLOW STAGES TAB ──────────────────────────────── */}
			{activeTab === "Workflow Stages" && (
				<WorkflowStagesTab projectId={project.id} />
			)}

			{/* ── ACTIVITY TAB ─────────────────────────────────────── */}
			{activeTab === "Activity" && (
				<ProjectActivityFeed projectId={project.id} />
			)}

			{/* ── SETTINGS TAB ─────────────────────────────────────── */}
			{activeTab === "Settings" && (
				<div className="space-y-5">
					<ProjectGeneralSection
						project={project}
						onSaved={(updated) =>
							setProject((prev) =>
								prev ? { ...prev, ...updated } : prev,
							)
						}
					/>
					<ProjectDangerZoneSection
						project={project}
						onDeleted={() => navigate("/projects")}
					/>
				</div>
			)}

			{/* ── Dialogs ──────────────────────────────────────────── */}
			<AddMemberDialog
				open={addUserOpen}
				onClose={() => setAddUserOpen(false)}
				projectId={project.id}
				currentMemberIds={members.map((m) => m.user_id)}
				profiles={profiles}
				onAdded={async () => {
					const refreshed = await getProject(project.id);
					setProject(refreshed);
				}}
			/>
			<EditProjectDialog
				open={editOpen}
				onClose={() => setEditOpen(false)}
				project={project}
				profiles={profiles}
				onSaved={(updated) => {
					setProject((prev) =>
						prev
							? {
									...updated,
									project_members: prev.project_members,
								}
							: updated,
					);
				}}
			/>
			<NewTaskDialogV2
				open={newTaskOpen}
				onClose={() => setNewTaskOpen(false)}
				projects={[project]}
				profiles={profiles}
				lockedProjectId={project.id}
				onCreate={async (pid: string, payload: CreateTaskPayload) => {
					const task = await createTask(pid, payload);
					setTasks((prev) => [task, ...prev]);
					toast.success("Task created");
				}}
			/>
			<TaskDetailDialogV2
				task={viewTask}
				projects={[project]}
				profiles={profiles}
				allTasks={[]}
				onClose={() => setViewTask(null)}
				onSaveNotes={handleSaveNotes}
				onUpdate={handleEditTask}
				onChangeStatus={handleChangeStatus}
				onOpenTask={(t) => setViewTask(t)}
				// onAddChild={(parent) => {
				// 	// setChildParent(parent);
				// 	// setDialogOpen(true);
				// }}
				// onEdit={(t) => {
				// 	// setViewTask(null);
				// 	// setEditTask(t);
				// }}
				// onDelete={(t) => {
				// 	// handleDeleteTask(t);
				// 	// setViewTask(null);
				// }}
			/>
		</div>
	);
}
