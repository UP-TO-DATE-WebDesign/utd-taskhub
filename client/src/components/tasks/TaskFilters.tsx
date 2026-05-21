import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type Project } from "@/services/project.service";
import { type Sprint } from "@/services/sprint.service";
import { type Profile } from "@/services/profile.service";

export interface TaskFiltersProps {
	projects: Project[];
	profiles: Profile[];
	sprints: Sprint[];
	sprintsLoading: boolean;
	view: "board" | "list";
	filterProject: string;
	filterSprint: string;
	filterUser: string;
	filterStatus: string;
	search: string;
	isFiltered: boolean;
	onFilterProjectChange: (v: string) => void;
	onFilterSprintChange: (v: string) => void;
	onFilterUserChange: (v: string) => void;
	onFilterStatusChange: (v: string) => void;
	onSearchChange: (v: string) => void;
	onViewChange: (v: "board" | "list") => void;
	onClearFilters: () => void;
}

export function TaskFilters({
	projects,
	profiles,
	sprints,
	sprintsLoading,
	view,
	filterProject,
	filterSprint,
	filterUser,
	filterStatus,
	search,
	isFiltered,
	onFilterProjectChange,
	onFilterSprintChange,
	onFilterUserChange,
	onFilterStatusChange,
	onSearchChange,
	onViewChange,
	onClearFilters,
}: TaskFiltersProps) {
	return (
		<div className="flex items-center gap-3 mb-6 flex-wrap">
			{/* Project */}
			<Select value={filterProject} onValueChange={onFilterProjectChange}>
				<SelectTrigger className="w-48 h-9">
					<SelectValue placeholder="All Projects" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Projects</SelectItem>
					{projects.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Sprint */}
			<div className="relative">
				{sprintsLoading && (
					<>
						<div className="h-full w-full absolute rounded-2xl bg-white/20 backdrop-blur-xs top-0 left-0 pointer-events-none" />
						<div className="bg-white/50 backdrop-blur-xs h-full w-full absolute rounded-2xl text-slate-600 flex items-center px-3 text-xs justify-start z-10 border border-border pointer-events-none">
							loading...
						</div>
					</>
				)}
				<Select
					value={filterSprint}
					onValueChange={onFilterSprintChange}
					disabled={sprintsLoading}
				>
					<SelectTrigger className="w-44 h-9">
						<SelectValue
							placeholder={sprintsLoading ? "Loading..." : "All Sprints"}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sprints</SelectItem>
						{sprints.map((s) => (
							<SelectItem key={s.id} value={s.id}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
				<Input
					placeholder="Search tasks..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-8 w-56 h-9 text-sm"
				/>
			</div>

			{/* User */}
			<Select value={filterUser} onValueChange={onFilterUserChange}>
				<SelectTrigger className="w-44 h-9">
					<SelectValue placeholder="All Users" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Users</SelectItem>
					{profiles.map((u) => (
						<SelectItem key={u.id} value={u.id}>
							{u.full_name ?? u.email}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Status (list view only) */}
			{view === "list" && (
				<Select value={filterStatus} onValueChange={onFilterStatusChange}>
					<SelectTrigger className="w-40 h-9">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="backlog">Backlog</SelectItem>
						<SelectItem value="todo">To Do</SelectItem>
						<SelectItem value="in-progress">In Progress</SelectItem>
						<SelectItem value="qa">QA</SelectItem>
						<SelectItem value="done">Done</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>
			)}

			{/* Clear filters */}
			{isFiltered && (
				<button
					onClick={onClearFilters}
					className="text-xs text-muted hover:text-foreground underline"
				>
					Clear filters
				</button>
			)}

			{/* View toggle */}
			<div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden bg-surface">
				<button
					onClick={() => onViewChange("board")}
					className={cn(
						"p-2 transition-colors",
						view === "board"
							? "bg-primary text-primary-foreground"
							: "text-muted hover:text-foreground hover:bg-muted-subtle",
					)}
				>
					<LayoutGrid className="h-4 w-4" />
				</button>
				<button
					onClick={() => onViewChange("list")}
					className={cn(
						"p-2 transition-colors",
						view === "list"
							? "bg-primary text-primary-foreground"
							: "text-muted hover:text-foreground hover:bg-muted-subtle",
					)}
				>
					<List className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
