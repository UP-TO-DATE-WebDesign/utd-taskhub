import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { type Sprint } from "@/services/sprint.service";
import { type ProjectMember } from "@/services/project-member.service";

export interface ProjectTaskFiltersProps {
	search: string;
	filterSprint: string;
	filterUser: string;
	sprints: Sprint[];
	sprintsLoading: boolean;
	members: ProjectMember[];
	isFiltered: boolean;
	onSearchChange: (v: string) => void;
	onFilterSprintChange: (v: string) => void;
	onFilterUserChange: (v: string) => void;
	onClearFilters: () => void;
}

export function ProjectTaskFilters({
	search,
	filterSprint,
	filterUser,
	sprints,
	sprintsLoading,
	members,
	isFiltered,
	onSearchChange,
	onFilterSprintChange,
	onFilterUserChange,
	onClearFilters,
}: ProjectTaskFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 mb-6">
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

			{/* User */}
			<div className="w-44">
				<SearchableSelect
					value={filterUser}
					onValueChange={(v) => onFilterUserChange(v || "all")}
					placeholder="All Users"
					options={[
						{ value: "all", label: "All Users" },
						...members.map<SearchableSelectOption>((m) => ({
							value: m.profiles.id,
							label: m.profiles.full_name ?? m.profiles.email,
							description: m.profiles.full_name
								? m.profiles.email
								: undefined,
						})),
					]}
				/>
			</div>

			{/* Clear filters */}
			{isFiltered && (
				<button
					onClick={onClearFilters}
					className="text-xs text-muted hover:text-foreground underline"
				>
					Clear filters
				</button>
			)}
		</div>
	);
}
