import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
		<div className="flex items-center gap-3 mb-6 flex-wrap">
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

			{/* User */}
			<Select value={filterUser} onValueChange={onFilterUserChange}>
				<SelectTrigger className="w-44 h-9">
					<SelectValue placeholder="All Users" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Users</SelectItem>
					{members.map((m) => (
						<SelectItem key={m.profiles.id} value={m.profiles.id}>
							{m.profiles.full_name ?? m.profiles.email}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

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
