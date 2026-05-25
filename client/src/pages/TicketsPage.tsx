import { useState, useEffect, useMemo } from "react";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listProjects, type Project } from "@/services/project.service";
import {
	listTickets,
	deleteTicket,
	type Ticket,
} from "@/services/ticket.service";
import { PermissionGate } from "@/components/PermissionGate";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { TicketsTableSkeleton } from "@/components/tickets/TicketsTableSkeleton";
import { TicketDialog } from "@/components/tickets/TicketDialog";
import { ConvertDialog } from "@/components/tickets/ConvertDialog";
import { CloseTicketDialog } from "@/components/tickets/CloseTicketDialog";
import { TicketsTable } from "@/components/tickets/TicketsTable";
import { TicketsFilters } from "@/components/tickets/TicketsFilters";
import type { Filters } from "@/components/tickets/types";
import { useApiSWR } from "@/hooks/useApiSWR";

export default function TicketsPage() {
	const { user } = useAuth();
	const { can, roleKey } = usePermission();

	function canEditTicket(ticket: Ticket): boolean {
		if (roleKey === "user") return ticket.created_by.id === user?.id;
		return can("Edit tickets");
	}

	function canDeleteTicket(ticket: Ticket): boolean {
		if (roleKey === "user") return ticket.created_by.id === user?.id;
		return can("Delete tickets");
	}

	const canConvert = can("Create & edit tasks");

	const [projects, setProjects] = useState<Project[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(true);
	const [selectedProjectId, setSelectedProjectId] = useState<string>("");

	const [filters, setFilters] = useState<Filters>({
		status: "",
		type: "",
		priority: "",
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [editTicket, setEditTicket] = useState<Ticket | null>(null);
	const [convertTicket, setConvertTicket] = useState<Ticket | null>(null);
	const [closingTicket, setClosingTicket] = useState<Ticket | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Load projects on mount
	useEffect(() => {
		setProjectsLoading(true);
		listProjects()
			.then((data) => {
				setProjects(data);
				if (data.length > 0) setSelectedProjectId(data[0].id);
			})
			.catch(() => toast.error("Failed to load projects."))
			.finally(() => setProjectsLoading(false));
	}, []);

	const ticketParams = useMemo(
		() => ({
			status: filters.status || undefined,
			type: filters.type || undefined,
			priority: filters.priority || undefined,
		}),
		[filters.status, filters.type, filters.priority],
	);

	const ticketsKey = selectedProjectId
		? (["tickets", selectedProjectId, ticketParams] as const)
		: null;

	const {
		data: tickets = [],
		error,
		isLoading: loading,
		mutate: mutateTickets,
	} = useApiSWR<Ticket[]>(ticketsKey, () =>
		listTickets(
			selectedProjectId,
			ticketParams as Parameters<typeof listTickets>[1],
		),
	);

	async function handleDelete(ticket: Ticket) {
		if (!window.confirm(`Delete "${ticket.title}"? This cannot be undone.`))
			return;
		setDeletingId(ticket.id);
		try {
			await deleteTicket(selectedProjectId, ticket.id);
			toast.success("Ticket deleted.");
			mutateTickets();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to delete ticket.";
			toast.error(msg);
		} finally {
			setDeletingId(null);
		}
	}

	function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}

	const hasFilters = filters.status || filters.type || filters.priority;

	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Header */}
			<div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						Tickets
					</h1>
					<p className="text-sm text-muted mt-1">
						{selectedProjectId
							? `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`
							: "Select a project to view tickets"}
					</p>
				</div>
				<PermissionGate feature="Create tickets">
					<Button
						className="flex items-center gap-2"
						disabled={!selectedProjectId}
						onClick={() => setCreateOpen(true)}
					>
						<Plus className="h-4 w-4" />
						New Ticket
					</Button>
				</PermissionGate>
			</div>

			{/* Project selector + Filters */}
			<TicketsFilters
				projects={projects}
				projectsLoading={projectsLoading}
				selectedProjectId={selectedProjectId}
				onSelectProject={setSelectedProjectId}
				filters={filters}
				onChangeFilter={setFilter}
				onClearFilters={() =>
					setFilters({ status: "", type: "", priority: "" })
				}
			/>

			{/* Loading */}
			{loading && <TicketsTableSkeleton />}

			{/* Error */}
			{!loading && error && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<p className="text-base font-medium text-foreground mb-1">
						Something went wrong
					</p>
					<p className="text-sm text-muted mb-4">{error.message}</p>
					<Button variant="outline" onClick={() => mutateTickets()}>
						Retry
					</Button>
				</div>
			)}

			{/* No project selected */}
			{!loading && !error && !selectedProjectId && (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<TicketIcon className="h-10 w-10 text-border-strong mb-4" />
					<p className="text-base font-medium text-foreground mb-1">
						No project selected
					</p>
					<p className="text-sm text-muted">
						Choose a project above to view its tickets.
					</p>
				</div>
			)}

			{/* Empty */}
			{!loading &&
				!error &&
				selectedProjectId &&
				tickets.length === 0 && (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<TicketIcon className="h-10 w-10 text-border-strong mb-4" />
						<p className="text-base font-medium text-foreground mb-1">
							No tickets found
						</p>
						<p className="text-sm text-muted">
							{hasFilters
								? "Try adjusting your filters."
								: "Create the first ticket for this project."}
						</p>
					</div>
				)}

			{/* Table */}
			{!loading && !error && selectedProjectId && tickets.length > 0 && (
				<TicketsTable
					tickets={tickets}
					deletingId={deletingId}
					canConvert={canConvert}
					canEditTicket={canEditTicket}
					canDeleteTicket={canDeleteTicket}
					onEdit={setEditTicket}
					onConvert={setConvertTicket}
					onDelete={handleDelete}
					onClose={setClosingTicket}
				/>
			)}

			{/* Dialogs */}
			<TicketDialog
				open={createOpen}
				mode="create"
				projectId={selectedProjectId}
				onClose={() => setCreateOpen(false)}
				onSaved={() => mutateTickets()}
			/>

			<TicketDialog
				open={editTicket !== null}
				mode="edit"
				ticket={editTicket ?? undefined}
				projectId={selectedProjectId}
				onClose={() => setEditTicket(null)}
				onSaved={() => mutateTickets()}
			/>

			<ConvertDialog
				open={convertTicket !== null}
				ticket={convertTicket}
				projectId={selectedProjectId}
				onClose={() => setConvertTicket(null)}
				onConverted={() => mutateTickets()}
			/>

			<CloseTicketDialog
				open={closingTicket !== null}
				ticket={closingTicket}
				projectId={selectedProjectId}
				onClose={() => setClosingTicket(null)}
				onClosed={() => mutateTickets()}
			/>
		</div>
	);
}
