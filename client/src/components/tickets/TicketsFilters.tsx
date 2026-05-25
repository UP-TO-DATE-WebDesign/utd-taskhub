import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type { Project } from "@/services/project.service";
import type {
	TicketType,
	TicketStatus,
	TicketPriority,
} from "@/services/ticket.service";
import {
	TICKET_TYPES,
	TICKET_STATUSES,
	TICKET_PRIORITIES,
} from "./constants";
import { typeLabel, statusLabel } from "./utils";
import type { Filters } from "./types";

interface TicketsFiltersProps {
	projects: Project[];
	projectsLoading: boolean;
	selectedProjectId: string;
	onSelectProject: (id: string) => void;
	filters: Filters;
	onChangeFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
	onClearFilters: () => void;
}

export function TicketsFilters({
	projects,
	projectsLoading,
	selectedProjectId,
	onSelectProject,
	filters,
	onChangeFilter,
	onClearFilters,
}: TicketsFiltersProps) {
	const hasFilters = filters.status || filters.type || filters.priority;

	return (
		<div className="flex flex-wrap items-center gap-3 mb-6">
			{/* Project */}
			<div className="w-full sm:w-auto sm:min-w-[200px]">
				{projectsLoading ? (
					<div className="h-9 rounded-md border border-border bg-muted-subtle animate-pulse" />
				) : (
					<SearchableSelect
						value={selectedProjectId}
						onValueChange={onSelectProject}
						placeholder="Select project..."
						options={projects.map<SearchableSelectOption>((p) => ({
							value: p.id,
							label: p.name,
						}))}
					/>
				)}
			</div>

			<div className="h-5 w-px bg-border hidden sm:block" />

			{/* Status filter */}
			<div className="w-[140px]">
				<SearchableSelect
					value={filters.status || "all"}
					onValueChange={(v) =>
						onChangeFilter(
							"status",
							v === "all" || !v ? "" : (v as TicketStatus),
						)
					}
					placeholder="Status"
					options={[
						{ value: "all", label: "All statuses" },
						...TICKET_STATUSES.map<SearchableSelectOption>((s) => ({
							value: s,
							label: statusLabel(s),
						})),
					]}
				/>
			</div>

			{/* Type filter */}
			<div className="w-[160px]">
				<SearchableSelect
					value={filters.type || "all"}
					onValueChange={(v) =>
						onChangeFilter(
							"type",
							v === "all" || !v ? "" : (v as TicketType),
						)
					}
					placeholder="Type"
					options={[
						{ value: "all", label: "All types" },
						...TICKET_TYPES.map<SearchableSelectOption>((t) => ({
							value: t,
							label: typeLabel(t),
						})),
					]}
				/>
			</div>

			{/* Priority filter */}
			<div className="w-[140px]">
				<SearchableSelect
					value={filters.priority || "all"}
					onValueChange={(v) =>
						onChangeFilter(
							"priority",
							v === "all" || !v ? "" : (v as TicketPriority),
						)
					}
					placeholder="Priority"
					options={[
						{ value: "all", label: "All priorities" },
						...TICKET_PRIORITIES.map<SearchableSelectOption>((p) => ({
							value: p,
							label: p.charAt(0).toUpperCase() + p.slice(1),
						})),
					]}
				/>
			</div>

			{hasFilters && (
				<button
					onClick={onClearFilters}
					className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2"
				>
					Clear filters
				</button>
			)}
		</div>
	);
}
