import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { closeTicket, type Ticket } from "@/services/ticket.service";

interface CloseTicketDialogProps {
	open: boolean;
	ticket: Ticket | null;
	projectId: string;
	onClose: () => void;
	onClosed: () => void;
}

export function CloseTicketDialog({
	open,
	ticket,
	projectId,
	onClose,
	onClosed,
}: CloseTicketDialogProps) {
	const [resolution, setResolution] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) setResolution("");
	}, [open]);

	async function handleConfirm() {
		if (!ticket) return;
		setSubmitting(true);
		try {
			await closeTicket(
				projectId,
				ticket.id,
				resolution.trim() ? resolution.trim() : undefined,
			);
			toast.success("Ticket closed.");
			onClosed();
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to close ticket.";
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) onClose();
			}}
		>
			<DialogContent className="max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Close ticket</DialogTitle>
					<DialogDescription>
						Closing locks the ticket. Admins and project managers
						will be notified.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<p className="text-sm text-foreground font-medium truncate">
						{ticket?.title}
					</p>
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-1.5 block">
							Resolution note (optional)
						</label>
						<textarea
							className="w-full min-h-[96px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							placeholder="Summarize what was done, link a PR, etc."
							maxLength={2000}
							value={resolution}
							onChange={(e) => setResolution(e.target.value)}
						/>
						<p className="mt-1 text-[10px] text-muted-foreground">
							{resolution.length}/2000
						</p>
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={handleConfirm} disabled={submitting}>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Close ticket
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
