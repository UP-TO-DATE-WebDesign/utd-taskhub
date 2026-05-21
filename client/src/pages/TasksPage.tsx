import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
	DndContext,
	DragOverlay,
	pointerWithin,
	rectIntersection,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragStartEvent,
	type DragOverEvent,
	type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	listAllTasks,
	createTask,
	updateTask,
	deleteTask,
	getTaskDetails,
	type Task,
	type ApiTaskStatus,
	type CreateTaskPayload,
	type UpdateTaskPayload,
} from "@/services/task.service";
import { listProjects, type Project } from "@/services/project.service";
import {
	listSprints,
	type Sprint,
	type EndSprintResponse,
	type StartSprintResponse,
} from "@/services/sprint.service";
import { listProfiles, type Profile } from "@/services/profile.service";
import { PermissionGate } from "@/components/PermissionGate";
import {
	type UiTask,
	type Columns,
	type ColumnId,
	toUiTask,
	buildColumns,
	columnIdToApiStatus,
	sortStages,
} from "@/components/tasks/types";
import { SYSTEM_STAGES } from "@/components/tasks/system-stages";
import {
	listWorkflowStages,
	type WorkflowStage,
} from "@/services/workflow-stage.service";
import { TaskCardContent, BoardColumn } from "@/components/tasks/TaskCard";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { NewTaskDialogV2 } from "@/components/tasks/NewTaskDialogV2";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { TaskDetailDialogV2 } from "@/components/tasks/TaskDetailDialogV2";
import { EndSprintButton } from "@/components/tasks/end-sprint/EndSprintButton";
import { StartSprintButton } from "@/components/tasks/start-sprint/StartSprintButton";
import { TasksPageSkeleton } from "@/components/tasks/TasksPageSkeleton";
import { useSearchParams } from "react-router-dom";
import { useApiSWR } from "@/hooks/useApiSWR";

export default function TasksPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const taskId = searchParams.get("taskId");
	const projectId = searchParams.get("projectId");

	const {
		data: rawTasks = [],
		error: tasksError,
		isLoading: tasksLoading,
		mutate: mutateTasks,
	} = useApiSWR<Task[]>(["tasks"], () => listAllTasks());
	const {
		data: projects = [],
		error: projectsError,
		isLoading: projectsLoading,
	} = useApiSWR<Project[]>(["projects"], () => listProjects());
	const {
		data: profiles = [],
		error: profilesError,
		isLoading: profilesLoading,
	} = useApiSWR<Profile[]>(["profiles"], () => listProfiles());

	const [filterProject, setFilterProject] = useState("all");

	const { data: projectStages } = useApiSWR<WorkflowStage[]>(
		filterProject !== "all" ? ["workflow-stages", filterProject] : null,
		() => listWorkflowStages(filterProject),
	);

	const stages = useMemo<WorkflowStage[]>(
		() => sortStages(projectStages ?? SYSTEM_STAGES),
		[projectStages],
	);
	const stageKeys = useMemo(() => stages.map((s) => s.key), [stages]);

	const columns = useMemo<Columns>(
		() => buildColumns(rawTasks.map(toUiTask), stages),
		[rawTasks, stages],
	);

	const loading = tasksLoading || projectsLoading || profilesLoading;
	const error = tasksError ?? projectsError ?? profilesError ?? null;

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editTask, setEditTask] = useState<UiTask | null>(null);
	const [viewTask, setViewTask] = useState<UiTask | null>(null);
	const [childParent, setChildParent] = useState<UiTask | null>(null);
	const [view, setView] = useState<"board" | "list">("board");

	const [filterSprint, setFilterSprint] = useState("all");
	const [filterSprintOptions, setFilterSprintOptions] = useState<Sprint[]>(
		[],
	);
	const [filterSprintsLoading, setFilterSprintsLoading] = useState(false);
	const [filterUser, setFilterUser] = useState("all");
	const [filterStatus, setFilterStatus] = useState("all");
	const [search, setSearch] = useState("");

	const columnsRef = useRef(columns);
	columnsRef.current = columns;
	const dragSrcColRef = useRef<ColumnId | null>(null);
	const didApplyDefaultSprintFilterRef = useRef(false);

	//open task details when taskId and projectId is present on url search params
	useEffect(() => {
		const t = setTimeout(() => {
			if (
				taskId &&
				typeof taskId === "string" &&
				projectId &&
				typeof projectId === "string" &&
				viewTask === null
			) {
				getTaskDetails(projectId, taskId).then((data) => {
					setViewTask(toUiTask(data));
				});
			}
		}, 250);
		return () => clearTimeout(t);
	}, [taskId, projectId, viewTask]);

	// ── Sprint filter options ────────────────────────────────────────────────

	useEffect(() => {
		let active = true;
		setFilterSprintsLoading(true);
		listSprints()
			.then((data) => {
				if (!active) return;
				setFilterSprintOptions(data);
				const activeSprint = data.find((s) => s.status === "active");
				if (activeSprint && !didApplyDefaultSprintFilterRef.current) {
					setFilterSprint((current) => {
						didApplyDefaultSprintFilterRef.current = true;
						return current === "all" ? activeSprint.id : current;
					});
				}
			})
			.catch(() => {
				if (active) setFilterSprintOptions([]);
			})
			.finally(() => {
				if (active) setFilterSprintsLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const removeParams = () => {
		const newParams = new URLSearchParams(searchParams);
		newParams.delete("taskId");
		newParams.delete("projectId");
		setSearchParams(newParams);
	};

	// ── DnD ──────────────────────────────────────────────────────────────────

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function findColumnId(taskId: string): ColumnId | null {
		for (const colId of stageKeys) {
			if (columnsRef.current[colId]?.some((t) => t.id === taskId))
				return colId;
		}
		return null;
	}

	const collisionDetection: CollisionDetection = useCallback((args) => {
		const pointerHits = pointerWithin(args);
		if (pointerHits.length > 0) return pointerHits;
		return rectIntersection(args);
	}, []);

	const onDragStart = useCallback(({ active }: DragStartEvent) => {
		setActiveTaskId(active.id as string);
		dragSrcColRef.current = findColumnId(active.id as string);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stageKeys]);

	const onDragOver = useCallback(
		({ active, over }: DragOverEvent) => {
			if (!over) return;
			const activeId = active.id as string;
			const overId = over.id as string;
			if (activeId === overId) return;

			const srcColId = findColumnId(activeId);
			const dstColId = (
				stageKeys.includes(overId)
					? overId
					: findColumnId(overId)
			) as ColumnId | null;

			if (!srcColId || !dstColId || srcColId === dstColId) return;

			mutateTasks(
				(curr) =>
					curr?.map((t) =>
						t.id === activeId
							? { ...t, status: columnIdToApiStatus(dstColId) }
							: t,
					),
				{ revalidate: false },
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[mutateTasks, stageKeys],
	);

	const onDragEnd = useCallback(
		({ active, over }: DragEndEvent) => {
			setActiveTaskId(null);
			if (!over) return;

			const activeId = active.id as string;
			const overId = over.id as string;
			const srcCol = dragSrcColRef.current;
			const curCol = findColumnId(activeId);
			void stageKeys; // capture stageKeys so closure refreshes when stages change

			if (srcCol && curCol && srcCol !== curCol) {
				const task = columnsRef.current[curCol]?.find(
					(t) => t.id === activeId,
				);
				const destStage = stages.find((s) => s.key === curCol);
				if (task) {
					updateTask(task.project_id, task.id, {
						status: columnIdToApiStatus(curCol),
					})
						.then(() => {
							toast.success("Task updated", {
								description: `Moved to ${destStage?.name ?? curCol}`,
							});
							mutateTasks();
						})
						.catch(() => {
							toast.error("Failed to move task", {
								description: "Please try again.",
							});
							mutateTasks();
						});
				}
				return;
			}

			if (activeId === overId) return;
			const colId = findColumnId(activeId);
			if (!colId) return;
			const overIsTask = !stageKeys.includes(overId);
			if (!overIsTask) return;
			const overColId = findColumnId(overId);
			if (!overColId || overColId !== colId) return;

			mutateTasks(
				(curr) => {
					if (!curr) return curr;
					const fromIdx = curr.findIndex((t) => t.id === activeId);
					const toIdx = curr.findIndex((t) => t.id === overId);
					if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return curr;
					return arrayMove(curr, fromIdx, toIdx);
				},
				{ revalidate: false },
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[mutateTasks, stageKeys, stages],
	);

	// ── Filtering ────────────────────────────────────────────────────────────

	const filteredColumns = useMemo<Columns>(() => {
		const lc = search.toLowerCase();
		return stageKeys.reduce((acc, colId) => {
			acc[colId] = (columns[colId] ?? []).filter((t) => {
				if (filterProject !== "all" && t.project_id !== filterProject)
					return false;
				if (filterSprint !== "all" && t.sprint?.id !== filterSprint)
					return false;
				if (filterUser !== "all" && t.assigned_to?.id !== filterUser)
					return false;
				if (
					filterStatus !== "all" &&
					t.apiStatus !== (filterStatus as ApiTaskStatus)
				)
					return false;
				if (search && !t.title.toLowerCase().includes(lc)) return false;
				return true;
			});
			return acc;
		}, {} as Columns);
	}, [
		columns,
		filterProject,
		filterSprint,
		filterUser,
		filterStatus,
		search,
		stageKeys,
	]);

	const allFilteredTasks = useMemo(
		() =>
			view === "list"
				? stageKeys.flatMap((c) => filteredColumns[c] ?? [])
				: [],
		[view, filteredColumns, stageKeys],
	);

	const allTasks = useMemo(
		() => stageKeys.flatMap((c) => columns[c] ?? []),
		[columns, stageKeys],
	);

	const defaultSprintFilter = useMemo(
		() =>
			filterSprintOptions.find((s) => s.status === "active")?.id ?? "all",
		[filterSprintOptions],
	);

	const activeSprint = useMemo(
		() => filterSprintOptions.find((s) => s.status === "active") ?? null,
		[filterSprintOptions],
	);

	const activeSprintTasks = useMemo<UiTask[]>(
		() =>
			activeSprint
				? stageKeys.flatMap((c) => columns[c] ?? []).filter(
						(t) => t.sprint?.id === activeSprint.id,
					)
				: [],
		[columns, activeSprint, stageKeys],
	);

	const nextPlannedSprint = useMemo<Sprint | null>(() => {
		if (activeSprint) return null;
		const today = new Date().toISOString().slice(0, 10);
		const planned = filterSprintOptions
			.filter(
				(s) =>
					s.status === "planned" &&
					s.start_date <= today &&
					today <= s.end_date,
			)
			.sort((a, b) => a.start_date.localeCompare(b.start_date));
		return planned[0] ?? null;
	}, [filterSprintOptions, activeSprint]);

	const startCandidateTasks = useMemo<UiTask[]>(() => {
		if (!nextPlannedSprint) return [];
		return stageKeys.flatMap((c) => columns[c] ?? []).filter(
			(t) =>
				t.sprint?.id !== nextPlannedSprint.id &&
				t.apiStatus !== "done" &&
				t.apiStatus !== "cancelled",
		);
	}, [columns, nextPlannedSprint, stageKeys]);

	const activeTask = useMemo(
		() =>
			activeTaskId
				? (stageKeys.flatMap((c) => columns[c] ?? []).find(
						(t) => t.id === activeTaskId,
					) ?? null)
				: null,
		[activeTaskId, columns, stageKeys],
	);

	const isFiltered =
		filterProject !== "all" ||
		filterSprint !== "all" ||
		filterUser !== "all" ||
		filterStatus !== "all" ||
		search !== "";

	// ── Handlers ─────────────────────────────────────────────────────────────

	const handleCreateTask = useCallback(
		async (projectId: string, payload: CreateTaskPayload) => {
			const apiTask = await createTask(projectId, payload);
			mutateTasks();
			toast.success("Task created", { description: apiTask.title });
		},
		[mutateTasks],
	);

	const handleDeleteTask = useCallback(
		async (task: UiTask) => {
			mutateTasks(
				(curr) => curr?.filter((t) => t.id !== task.id),
				{ revalidate: false },
			);
			try {
				await deleteTask(task.project_id, task.id);
				toast.success("Task deleted", { description: task.title });
				mutateTasks();
			} catch {
				mutateTasks();
				toast.error("Failed to delete task", {
					description: "Please try again.",
				});
			}
		},
		[mutateTasks],
	);

	const handleSaveNotes = useCallback(
		async (task: UiTask, notes: string) => {
			const apiTask = await updateTask(task.project_id, task.id, {
				developer_notes: notes,
			});
			const updated = toUiTask(apiTask);
			mutateTasks();
			if (updated) setViewTask(updated);
			toast.success("Notes saved");
		},
		[mutateTasks],
	);

	const handleChangeStatus = useCallback(
		async (task: UiTask, status: ApiTaskStatus) => {
			const apiTask = await updateTask(task.project_id, task.id, {
				status,
			});
			const updated = toUiTask(apiTask);
			mutateTasks();
			if (!updated) {
				setViewTask(null);
				toast.success("Status updated");
				return;
			}
			setViewTask(updated);
			toast.success("Status updated", {
				description:
					stages.find((s) => s.key === updated.columnId)?.name ??
					updated.columnId,
			});
		},
		[mutateTasks],
	);

	const handleSprintStarted = useCallback(
		async (result: StartSprintResponse) => {
			try {
				const sprints = await listSprints();
				setFilterSprintOptions(sprints);
				setFilterSprint(result.sprint.id);
				didApplyDefaultSprintFilterRef.current = true;
				mutateTasks();
			} catch {
				toast.error("Sprint started, but failed to refresh board.", {
					description: "Reload the page to see latest state.",
				});
			}
		},
		[mutateTasks],
	);

	const handleSprintEnded = useCallback(
		async (_result: EndSprintResponse) => {
			try {
				const sprints = await listSprints();
				setFilterSprintOptions(sprints);
				setFilterSprint("all");
				didApplyDefaultSprintFilterRef.current = true;
				mutateTasks();
			} catch {
				toast.error("Sprint ended, but failed to refresh board.", {
					description: "Reload the page to see latest state.",
				});
			}
		},
		[mutateTasks],
	);

	const handleEditTask = useCallback(
		async (task: UiTask, payload: UpdateTaskPayload) => {
			const apiTask = await updateTask(task.project_id, task.id, payload);
			const updated = toUiTask(apiTask);
			mutateTasks();
			if (updated) {
				setViewTask((vt) => (vt && vt.id === updated.id ? updated : vt));
			}
			toast.success("Task updated", { description: apiTask.title });
		},
		[mutateTasks],
	);

	// ── Loading / Error ───────────────────────────────────────────────────────

	if (loading) {
		return <TasksPageSkeleton />;
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm font-medium text-foreground mb-1">
					Failed to load tasks
				</p>
				<p className="text-xs text-muted">{error.message}</p>
			</div>
		);
	}

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<div className="mx-auto max-w-[1280px] px-6 py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						Tasks
					</h1>
					<p className="text-sm text-muted mt-1">
						{stageKeys.reduce(
							(s, c) => s + (columns[c]?.length ?? 0),
							0,
						)}{" "}
						tasks across all projects
					</p>
				</div>
				<div className="flex items-center gap-2">
					<StartSprintButton
						nextSprint={nextPlannedSprint}
						candidateTasks={startCandidateTasks}
						onStarted={handleSprintStarted}
					/>
					<EndSprintButton
						activeSprint={activeSprint}
						sprintTasks={activeSprintTasks}
						onEnded={handleSprintEnded}
					/>
					<PermissionGate feature="Create & edit tasks">
						<Button
							className="flex items-center gap-2"
							onClick={() => setDialogOpen(true)}
						>
							<Plus className="h-4 w-4" />
							New Task
						</Button>
					</PermissionGate>
				</div>
			</div>

			<TaskFilters
				projects={projects}
				profiles={profiles}
				sprints={filterSprintOptions}
				sprintsLoading={filterSprintsLoading}
				view={view}
				stages={stages}
				filterProject={filterProject}
				filterSprint={filterSprint}
				filterUser={filterUser}
				filterStatus={filterStatus}
				search={search}
				isFiltered={isFiltered}
				onFilterProjectChange={setFilterProject}
				onFilterSprintChange={setFilterSprint}
				onFilterUserChange={setFilterUser}
				onFilterStatusChange={setFilterStatus}
				onSearchChange={setSearch}
				onViewChange={setView}
				onClearFilters={() => {
					setFilterProject("all");
					setFilterSprint(defaultSprintFilter);
					setFilterUser("all");
					setFilterStatus("all");
					setSearch("");
				}}
			/>

			{/* Board view */}
			{view === "board" && (
				<DndContext
					sensors={sensors}
					collisionDetection={collisionDetection}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDragEnd={onDragEnd}
				>
					<div className="flex gap-4 overflow-x-auto pb-4 items-start">
						{stages.map((stage) => (
							<BoardColumn
								key={stage.key}
								stage={stage}
								tasks={filteredColumns[stage.key] ?? []}
								projects={projects}
								onEdit={setEditTask}
								onDelete={handleDeleteTask}
								onView={setViewTask}
							/>
						))}
					</div>

					<DragOverlay
						dropAnimation={{ duration: 150, easing: "ease" }}
					>
						{activeTask ? (
							<div className="w-[272px]">
								<TaskCardContent
									task={activeTask}
									projects={projects}
									isDragging
								/>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			)}

			{/* List view */}
			{view === "list" && (
				<TaskTable
					tasks={allFilteredTasks}
					projects={projects}
					onView={setViewTask}
				/>
			)}

			<NewTaskDialogV2
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
					setChildParent(null);
				}}
				onCreate={handleCreateTask}
				projects={projects}
				profiles={profiles}
				parentTaskId={childParent?.id}
				lockedProjectId={childParent?.project_id}
				stages={stages}
			/>

			<EditTaskDialog
				task={editTask}
				onClose={() => setEditTask(null)}
				onSave={handleEditTask}
				projects={projects}
				profiles={profiles}
			/>

			<TaskDetailDialogV2
				task={viewTask}
				projects={projects}
				profiles={profiles}
				allTasks={allTasks}
				stages={stages}
				onClose={() => {
					removeParams();
					setViewTask(null);
				}}
				onSaveNotes={handleSaveNotes}
				onUpdate={handleEditTask}
				onChangeStatus={handleChangeStatus}
				onOpenTask={(t) => setViewTask(t)}
				onAddChild={(parent) => {
					setChildParent(parent);
					setDialogOpen(true);
				}}
				onEdit={(t) => {
					setViewTask(null);
					setEditTask(t);
				}}
				onDelete={(t) => {
					handleDeleteTask(t);
					setViewTask(null);
				}}
			/>
		</div>
	);
}
