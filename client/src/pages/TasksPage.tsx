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
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	listAllTasks,
	createTask,
	updateTask,
	deleteTask,
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
	COLUMN_IDS,
	COLUMN_LABELS,
	toUiTask,
	buildColumns,
	emptyColumns,
	columnIdToApiStatus,
} from "@/components/tasks/types";
import { TaskCardContent, BoardColumn } from "@/components/tasks/TaskCard";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { TaskDetailDialogV2 } from "@/components/tasks/TaskDetailDialogV2";
import { EndSprintButton } from "@/components/tasks/end-sprint/EndSprintButton";
import { StartSprintButton } from "@/components/tasks/start-sprint/StartSprintButton";

export default function TasksPage() {
	const [columns, setColumns] = useState<Columns>(emptyColumns);
	const [projects, setProjects] = useState<Project[]>([]);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editTask, setEditTask] = useState<UiTask | null>(null);
	const [viewTask, setViewTask] = useState<UiTask | null>(null);
	const [childParent, setChildParent] = useState<UiTask | null>(null);
	const [view, setView] = useState<"board" | "list">("board");

	const [filterProject, setFilterProject] = useState("all");
	const [filterSprint, setFilterSprint] = useState("all");
	const [filterSprintOptions, setFilterSprintOptions] = useState<Sprint[]>([]);
	const [filterSprintsLoading, setFilterSprintsLoading] = useState(false);
	const [filterUser, setFilterUser] = useState("all");
	const [filterStatus, setFilterStatus] = useState("all");
	const [search, setSearch] = useState("");

	const columnsRef = useRef(columns);
	columnsRef.current = columns;
	const dragSrcColRef = useRef<ColumnId | null>(null);
	const didApplyDefaultSprintFilterRef = useRef(false);

	// ── Data loading ─────────────────────────────────────────────────────────

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [tasks, projs, profs] = await Promise.all([
					listAllTasks(),
					listProjects(),
					listProfiles(),
				]);
				if (cancelled) return;
				setProjects(projs);
				setProfiles(profs);
				setColumns(
					buildColumns(
						tasks.map(toUiTask).filter((u): u is UiTask => u !== null),
					),
				);
			} catch (e) {
				if (!cancelled) setError((e as Error).message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => { cancelled = true; };
	}, []);

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
			.catch(() => { if (active) setFilterSprintOptions([]); })
			.finally(() => { if (active) setFilterSprintsLoading(false); });
		return () => { active = false; };
	}, []);

	// ── DnD ──────────────────────────────────────────────────────────────────

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function findColumnId(taskId: string): ColumnId | null {
		for (const colId of COLUMN_IDS) {
			if (columnsRef.current[colId].some((t) => t.id === taskId)) return colId;
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
	}, []);

	const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
		if (!over) return;
		const activeId = active.id as string;
		const overId = over.id as string;
		if (activeId === overId) return;

		const srcColId = findColumnId(activeId);
		const dstColId = (
			COLUMN_IDS.includes(overId as ColumnId) ? overId : findColumnId(overId)
		) as ColumnId | null;

		if (!srcColId || !dstColId || srcColId === dstColId) return;

		setColumns((prev) => {
			const srcTasks = [...prev[srcColId]];
			const dstTasks = [...prev[dstColId]];
			const srcIdx = srcTasks.findIndex((t) => t.id === activeId);
			if (srcIdx < 0) return prev;
			const moved = { ...srcTasks[srcIdx], columnId: dstColId };
			const newSrc = srcTasks.filter((t) => t.id !== activeId);
			const overIdx = dstTasks.findIndex((t) => t.id === overId);
			const insertAt = overIdx >= 0 ? overIdx : dstTasks.length;
			const newDst = [
				...dstTasks.slice(0, insertAt),
				moved,
				...dstTasks.slice(insertAt),
			];
			return { ...prev, [srcColId]: newSrc, [dstColId]: newDst };
		});
	}, []);

	const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
		setActiveTaskId(null);
		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;
		const srcCol = dragSrcColRef.current;
		const curCol = findColumnId(activeId);

		if (srcCol && curCol && srcCol !== curCol) {
			const task = columnsRef.current[curCol].find((t) => t.id === activeId);
			if (task) {
				updateTask(task.project_id, task.id, {
					status: columnIdToApiStatus(curCol),
				})
					.then(() =>
						toast.success("Task updated", {
							description: `Moved to ${COLUMN_LABELS[curCol]}`,
						}),
					)
					.catch(() => {
						toast.error("Failed to move task", { description: "Please try again." });
						listAllTasks().then((tasks) =>
							setColumns(
								buildColumns(
									tasks.map(toUiTask).filter((u): u is UiTask => u !== null),
								),
							),
						);
					});
			}
			return;
		}

		if (activeId === overId) return;
		const colId = findColumnId(activeId);
		if (!colId) return;
		const overIsTask = !COLUMN_IDS.includes(overId as ColumnId);
		if (!overIsTask) return;
		const overColId = findColumnId(overId);
		if (!overColId || overColId !== colId) return;

		setColumns((prev) => {
			const items = prev[colId];
			const fromIdx = items.findIndex((t) => t.id === activeId);
			const toIdx = items.findIndex((t) => t.id === overId);
			if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
			return { ...prev, [colId]: arrayMove(items, fromIdx, toIdx) };
		});
	}, []);

	// ── Filtering ────────────────────────────────────────────────────────────

	const filteredColumns = useMemo<Columns>(() => {
		const lc = search.toLowerCase();
		return COLUMN_IDS.reduce((acc, colId) => {
			acc[colId] = columns[colId].filter((t) => {
				if (filterProject !== "all" && t.project_id !== filterProject) return false;
				if (filterSprint !== "all" && t.sprint?.id !== filterSprint) return false;
				if (filterUser !== "all" && t.assigned_to?.id !== filterUser) return false;
				if (filterStatus !== "all" && t.apiStatus !== (filterStatus as ApiTaskStatus)) return false;
				if (search && !t.title.toLowerCase().includes(lc)) return false;
				return true;
			});
			return acc;
		}, {} as Columns);
	}, [columns, filterProject, filterSprint, filterUser, filterStatus, search]);

	const allFilteredTasks = useMemo(
		() => (view === "list" ? COLUMN_IDS.flatMap((c) => filteredColumns[c]) : []),
		[view, filteredColumns],
	);

	const allTasks = useMemo(
		() => COLUMN_IDS.flatMap((c) => columns[c]),
		[columns],
	);

	const defaultSprintFilter = useMemo(
		() => filterSprintOptions.find((s) => s.status === "active")?.id ?? "all",
		[filterSprintOptions],
	);

	const activeSprint = useMemo(
		() => filterSprintOptions.find((s) => s.status === "active") ?? null,
		[filterSprintOptions],
	);

	const activeSprintTasks = useMemo<UiTask[]>(
		() =>
			activeSprint
				? COLUMN_IDS.flatMap((c) => columns[c]).filter(
						(t) => t.sprint?.id === activeSprint.id,
					)
				: [],
		[columns, activeSprint],
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
		return COLUMN_IDS.flatMap((c) => columns[c]).filter(
			(t) =>
				t.sprint?.id !== nextPlannedSprint.id &&
				t.apiStatus !== "done" &&
				t.apiStatus !== "cancelled",
		);
	}, [columns, nextPlannedSprint]);

	const activeTask = useMemo(
		() =>
			activeTaskId
				? (COLUMN_IDS.flatMap((c) => columns[c]).find(
						(t) => t.id === activeTaskId,
					) ?? null)
				: null,
		[activeTaskId, columns],
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
			const ui = toUiTask(apiTask);
			if (!ui) return;
			setColumns((prev) => ({
				...prev,
				[ui.columnId]: [ui, ...prev[ui.columnId]],
			}));
			toast.success("Task created", { description: apiTask.title });
		},
		[],
	);

	const handleDeleteTask = useCallback(async (task: UiTask) => {
		setColumns((prev) => ({
			...prev,
			[task.columnId]: prev[task.columnId].filter((t) => t.id !== task.id),
		}));
		try {
			await deleteTask(task.project_id, task.id);
			toast.success("Task deleted", { description: task.title });
		} catch {
			setColumns((prev) => ({
				...prev,
				[task.columnId]: [task, ...prev[task.columnId]],
			}));
			toast.error("Failed to delete task", { description: "Please try again." });
		}
	}, []);

	const handleSaveNotes = useCallback(async (task: UiTask, notes: string) => {
		const apiTask = await updateTask(task.project_id, task.id, { developer_notes: notes });
		const updated = toUiTask(apiTask);
		if (!updated) return;
		setColumns((prev) => ({
			...prev,
			[updated.columnId]: prev[updated.columnId].map((t) =>
				t.id === updated.id ? updated : t,
			),
		}));
		setViewTask(updated);
		toast.success("Notes saved");
	}, []);

	const handleChangeStatus = useCallback(
		async (task: UiTask, status: ApiTaskStatus) => {
			const apiTask = await updateTask(task.project_id, task.id, { status });
			const updated = toUiTask(apiTask);
			if (!updated) {
				setColumns((prev) => ({
					...prev,
					[task.columnId]: prev[task.columnId].filter((t) => t.id !== task.id),
				}));
				setViewTask(null);
				toast.success("Status updated");
				return;
			}
			setColumns((prev) => {
				const withoutOld = {
					...prev,
					[task.columnId]: prev[task.columnId].filter((t) => t.id !== task.id),
				};
				return {
					...withoutOld,
					[updated.columnId]: [
						updated,
						...withoutOld[updated.columnId].filter((t) => t.id !== updated.id),
					],
				};
			});
			setViewTask(updated);
			toast.success("Status updated", {
				description: COLUMN_LABELS[updated.columnId],
			});
		},
		[],
	);

	const handleSprintStarted = useCallback(
		async (result: StartSprintResponse) => {
			try {
				const [tasks, sprints] = await Promise.all([
					listAllTasks(),
					listSprints(),
				]);
				setColumns(
					buildColumns(
						tasks
							.map(toUiTask)
							.filter((u): u is UiTask => u !== null),
					),
				);
				setFilterSprintOptions(sprints);
				setFilterSprint(result.sprint.id);
				didApplyDefaultSprintFilterRef.current = true;
			} catch {
				toast.error("Sprint started, but failed to refresh board.", {
					description: "Reload the page to see latest state.",
				});
			}
		},
		[],
	);

	const handleSprintEnded = useCallback(async (_result: EndSprintResponse) => {
		try {
			const [tasks, sprints] = await Promise.all([
				listAllTasks(),
				listSprints(),
			]);
			setColumns(
				buildColumns(
					tasks.map(toUiTask).filter((u): u is UiTask => u !== null),
				),
			);
			setFilterSprintOptions(sprints);
			setFilterSprint("all");
			didApplyDefaultSprintFilterRef.current = true;
		} catch {
			toast.error("Sprint ended, but failed to refresh board.", {
				description: "Reload the page to see latest state.",
			});
		}
	}, []);

	const handleEditTask = useCallback(
		async (task: UiTask, payload: UpdateTaskPayload) => {
			const apiTask = await updateTask(task.project_id, task.id, payload);
			const updated = toUiTask(apiTask);
			if (!updated) return;
			setColumns((prev) => {
				const withoutOld = {
					...prev,
					[task.columnId]: prev[task.columnId].filter((t) => t.id !== task.id),
				};
				return {
					...withoutOld,
					[updated.columnId]: [
						updated,
						...withoutOld[updated.columnId].filter((t) => t.id !== updated.id),
					],
				};
			});
			setViewTask((vt) => (vt && vt.id === updated.id ? updated : vt));
			toast.success("Task updated", { description: apiTask.title });
		},
		[],
	);

	// ── Loading / Error ───────────────────────────────────────────────────────

	if (loading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-6 w-6 animate-spin text-muted" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm font-medium text-foreground mb-1">Failed to load tasks</p>
				<p className="text-xs text-muted">{error}</p>
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
						{COLUMN_IDS.reduce((s, c) => s + columns[c].length, 0)} tasks across all projects
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
						<Button className="flex items-center gap-2" onClick={() => setDialogOpen(true)}>
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
						{COLUMN_IDS.map((colId) => (
							<BoardColumn
								key={colId}
								colId={colId}
								tasks={filteredColumns[colId]}
								projects={projects}
								onEdit={setEditTask}
								onDelete={handleDeleteTask}
								onView={setViewTask}
							/>
						))}
					</div>

					<DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
						{activeTask ? (
							<div className="w-[272px]">
								<TaskCardContent task={activeTask} projects={projects} isDragging />
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

			<NewTaskDialog
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
				onClose={() => setViewTask(null)}
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
