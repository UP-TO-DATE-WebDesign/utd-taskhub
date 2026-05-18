import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { addMember } from "@/services/project-member.service";
import { type Profile } from "@/services/profile.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getInitials, avatarColor } from "./utils";

export function AddMemberDialog({
	open,
	onClose,
	projectId,
	currentMemberIds,
	profiles,
	onAdded,
}: {
	open: boolean;
	onClose: () => void;
	projectId: string;
	currentMemberIds: string[];
	profiles: Profile[];
	onAdded: (userId: string) => void;
}) {
	const [selectedId, setSelectedId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const available = profiles.filter((p) => !currentMemberIds.includes(p.id));

	async function handleSubmit() {
		if (!selectedId) return;
		setSubmitting(true);
		setError(null);
		try {
			await addMember(projectId, selectedId);
			onAdded(selectedId);
			setSelectedId("");
			onClose();
			toast.success("Member added");
		} catch {
			setError("Failed to add member. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			setSelectedId("");
			setError(null);
		}
		if (!isOpen) onClose();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[420px]">
				<DialogHeader>
					<DialogTitle>Add Team Member</DialogTitle>
					<DialogDescription>
						Select a user to add to this project.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{available.length === 0 ? (
						<p className="text-sm text-muted text-center py-4">
							All users are already members.
						</p>
					) : (
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{available.map((p, i) => (
								<label
									key={p.id}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
										selectedId === p.id
											? "border-primary bg-primary-subtle"
											: "border-border hover:bg-muted-subtle",
									)}
								>
									<input
										type="radio"
										name="member"
										value={p.id}
										checked={selectedId === p.id}
										onChange={() => setSelectedId(p.id)}
										className="sr-only"
									/>
									<Avatar className="h-8 w-8 shrink-0">
										<AvatarImage
											src={p.avatar_url ?? undefined}
											alt={p.full_name ?? ""}
										/>
										<AvatarFallback
											className={`text-[10px] text-white ${avatarColor(String(p.full_name)?.length)}`}
										>
											{getInitials(p.full_name)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-foreground truncate">
											{p.full_name ?? p.email}
										</p>
										<p className="text-xs text-muted truncate">
											{p.email}
										</p>
									</div>
								</label>
							))}
						</div>
					)}

					{error && <p className="text-xs text-danger">{error}</p>}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleSubmit}
						disabled={
							submitting || !selectedId || available.length === 0
						}
					>
						{submitting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Add Member
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
