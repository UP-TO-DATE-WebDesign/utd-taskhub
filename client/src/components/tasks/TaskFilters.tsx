import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { type Project } from "@/services/project.service";
import { type Sprint } from "@/services/sprint.service";
import { type Profile } from "@/services/profile.service";
import type { WorkflowStage } from "@/services/workflow-stage.service";
import { SYSTEM_STAGES } from "./system-stages";

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
	stages?: WorkflowStage[];
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
	stages,
	onFilterProjectChange,
	onFilterSprintChange,
	onFilterUserChange,
	onFilterStatusChange,
	onSearchChange,
	onViewChange,
	onClearFilters,
}: TaskFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 mb-6">
			{/* Project */}
			<div className="w-48">
				<SearchableSelect
					value={filterProject}
					onValueChange={(v) => onFilterProjectChange(v || "all")}
					placeholder="All Projects"
					options={[
						{ value: "all", label: "All Projects" },
						...projects.map<SearchableSelectOption>((p) => ({
							value: p.id,
							label: p.name,
						})),
					]}
				/>
			</div>

			{/* Sprint */}
			<div className="w-44">
				<SearchableSelect
					value={filterSprint}
					onValueChange={(v) => onFilterSprintChange(v || "all")}
					disabled={sprintsLoading}
					loading={sprintsLoading}
					placeholder={sprintsLoading ? "Loading..." : "All Sprints"}
					options={[
						{ value: "all", label: "All Sprints" },
						...sprints.map<SearchableSelectOption>((s) => ({
							value: s.id,
							label: s.name,
						})),
					]}
				/>
			</div>

			{/* Search */}
			<div className="relative w-full sm:w-auto">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
				<Input
					placeholder="Search tasks..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-8 w-full h-9 text-sm sm:w-56"
				/>
			</div>

			{/* User */}
			<div className="w-44">
				<SearchableSelect
					value={filterUser}
					onValueChange={(v) => onFilterUserChange(v || "all")}
					placeholder="All Users"
					options={[
						{ value: "all", label: "All Users" },
						...profiles.map<SearchableSelectOption>((u) => ({
							value: u.id,
							label: u.full_name ?? u.email,
							description: u.full_name ? u.email : undefined,
							meta: { avatar_url: u.avatar_url },
						})),
					]}
					renderOption={(opt) => (
						<div className="flex items-center gap-2">
							<div>
								<div className="text-xs font-medium">
									{opt.label}
								</div>
								{opt.description && (
									<div className="text-[8px] text-muted truncate overflow-hidden line-clamp-1">
										{String(opt.description).split("@")[0]}
									</div>
								)}
							</div>
						</div>
					)}
				/>
			</div>

			{/* Status (list view only) */}
			{view === "list" && (
				<div className="w-40">
					<SearchableSelect
						value={filterStatus}
						onValueChange={(v) => onFilterStatusChange(v || "all")}
						placeholder="All Statuses"
						options={[
							{ value: "all", label: "All Statuses" },
							...(
								stages ?? SYSTEM_STAGES
							).map<SearchableSelectOption>((stage) => ({
								value: stage.key,
								label: stage.name,
							})),
						]}
					/>
				</div>
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
