import { useState } from "react";
import { Hash, UserCircle, Clock, CheckCircle2, Tag, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { SectionBlock, Toggle } from "./SectionBlock";

export function TicketsSection() {
	const [ticketPrefix, setTicketPrefix] = useState("TKT");
	const [defaultPriority, setDefaultPriority] = useState("medium");
	const [defaultAssignee, setDefaultAssignee] = useState("unassigned");
	const [autoClose, setAutoClose] = useState(true);
	const [slaEnabled, setSlaEnabled] = useState(true);
	const [slaHours, setSlaHours] = useState("24");

	return (
		<SectionBlock
			title="Tickets"
			description="Configure how support tickets are created, assigned, and resolved."
		>
			<div className="space-y-6">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Ticket ID Prefix
						</label>
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
								<Input
									value={ticketPrefix}
									onChange={(e) =>
										setTicketPrefix(e.target.value.toUpperCase().slice(0, 6))
									}
									className="pl-8 font-mono uppercase"
									placeholder="TKT"
								/>
							</div>
							<span className="text-xs text-muted px-3 py-2 bg-muted-subtle rounded-lg border border-border font-mono whitespace-nowrap">
								#{ticketPrefix || "TKT"}-001
							</span>
						</div>
						<p className="text-[11px] text-muted mt-1.5">
							Max 6 characters. Used to generate ticket IDs.
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Default Priority
						</label>
						<SearchableSelect
							value={defaultPriority}
							onValueChange={setDefaultPriority}
							options={[
								{ value: "urgent", label: "Urgent" },
								{ value: "high", label: "High" },
								{ value: "medium", label: "Medium" },
								{ value: "low", label: "Low" },
							]}
						/>
						<p className="text-[11px] text-muted mt-1.5">
							Applied to new tickets with no priority set.
						</p>
					</div>
				</div>

				<Separator />

				<div>
					<p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
						<UserCircle className="h-4 w-4 text-primary" />
						Assignment & SLA
					</p>
					<div className="space-y-3">
						<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 rounded-lg bg-primary-subtle flex items-center justify-center shrink-0">
									<UserCircle className="h-4 w-4 text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">Default Assignee</p>
									<p className="text-xs text-muted mt-0.5">
										Who gets new tickets when no assignee is specified
									</p>
								</div>
							</div>
							<div className="w-40">
								<SearchableSelect
									value={defaultAssignee}
									onValueChange={setDefaultAssignee}
									options={[
										{ value: "unassigned", label: "Unassigned" },
										{ value: "jd", label: "John Doe" },
										{ value: "sm", label: "Sarah Miller" },
										{ value: "round-robin", label: "Round Robin" },
									]}
								/>
							</div>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
									<Clock className="h-4 w-4 text-accent" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">SLA Response Time</p>
									<p className="text-xs text-muted mt-0.5">
										Target first-response window for open tickets
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Toggle checked={slaEnabled} onChange={() => setSlaEnabled((v) => !v)} />
								{slaEnabled && (
									<div className="flex items-center gap-1.5 ml-2">
										<Input
											value={slaHours}
											onChange={(e) => setSlaHours(e.target.value)}
											className="w-16 text-center text-sm"
										/>
										<span className="text-xs text-muted">hrs</span>
									</div>
								)}
							</div>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 rounded-lg bg-secondary-subtle flex items-center justify-center shrink-0">
									<CheckCircle2 className="h-4 w-4 text-secondary" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">
										Auto-close Resolved Tickets
									</p>
									<p className="text-xs text-muted mt-0.5">
										Automatically close tickets 7 days after resolution
									</p>
								</div>
							</div>
							<Toggle checked={autoClose} onChange={() => setAutoClose((v) => !v)} />
						</div>
					</div>
				</div>

				<Separator />

				<div>
					<p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
						<Tag className="h-4 w-4 text-primary" />
						Categories
					</p>
					<div className="flex flex-wrap gap-2">
						{["Bug", "Feature Request", "IT Support", "Billing", "Security"].map((cat) => (
							<span
								key={cat}
								className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface text-muted-foreground"
							>
								{cat}
								<button className="text-muted hover:text-danger transition-colors">
									<X className="h-3 w-3" />
								</button>
							</span>
						))}
						<button className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-dashed border-border-strong text-muted-foreground hover:border-primary hover:text-primary transition-colors">
							<Plus className="h-3 w-3" />
							Add Category
						</button>
					</div>
				</div>
			</div>
			<div className="mt-5 flex justify-end">
				<Button size="sm">Save Changes</Button>
			</div>
		</SectionBlock>
	);
}
