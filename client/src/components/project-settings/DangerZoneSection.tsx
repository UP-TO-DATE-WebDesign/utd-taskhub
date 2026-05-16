import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { deleteProject, type Project } from "@/services/project.service";

export function DangerZoneSection({
	project,
	onDeleted,
}: {
	project: Project;
	onDeleted: () => void;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<>
			<Card className="p-6 border-danger/30">
				<div className="mb-5">
					<h2 className="text-base font-semibold text-danger">
						Danger Zone
					</h2>
					<p className="text-xs text-muted mt-0.5">
						Irreversible and destructive actions.
					</p>
				</div>
				<div className="space-y-4">
					<div className="flex items-center justify-between py-3 border border-danger/20 rounded-lg px-4 bg-danger-subtle/40">
						<div>
							<p className="text-sm font-medium text-foreground">
								Delete Project
							</p>
							<p className="text-xs text-muted mt-0.5">
								Permanently delete this project, including all tasks,
								tickets, members, and activity. This cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => setDialogOpen(true)}
							className="shrink-0 ml-4 bg-danger text-white hover:bg-danger/90"
						>
							Delete Project
						</Button>
					</div>
				</div>
			</Card>

			<DeleteProjectDialog
				open={dialogOpen}
				project={project}
				onClose={() => setDialogOpen(false)}
				onDeleted={onDeleted}
			/>
		</>
	);
}

function DeleteProjectDialog({
	open,
	project,
	onClose,
	onDeleted,
}: {
	open: boolean;
	project: Project;
	onClose: () => void;
	onDeleted: () => void;
}) {
	const [value, setValue] = useState("");
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!open) {
			setValue("");
			setDeleting(false);
		}
	}, [open]);

	const matches = value.trim() === project.name;

	async function handleDelete() {
		if (!matches || deleting) return;
		setDeleting(true);
		try {
			await deleteProject(project.id);
			toast.success("Project deleted", { description: project.name });
			onClose();
			onDeleted();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to delete project.";
			toast.error(msg);
			setDeleting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				if (!val && !deleting) onClose();
			}}
		>
			<DialogContent className="max-w-[440px]">
				<DialogHeader>
					<DialogTitle>Delete Project</DialogTitle>
					<DialogDescription>
						You are about to permanently delete{" "}
						<span className="font-medium text-foreground">
							{project.name}
						</span>
						. All tasks, tickets, members, and activity will be removed.
						This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<label className="text-sm font-medium text-muted-foreground block">
						Type{" "}
						<span className="font-mono text-foreground">
							{project.name}
						</span>{" "}
						to confirm
					</label>
					<Input
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={`Type "${project.name}" to confirm`}
						disabled={deleting}
						autoFocus
					/>
					{value.length > 0 && !matches && (
						<p className="text-[11px] text-danger">
							Name does not match.
						</p>
					)}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={deleting}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!matches || deleting}
						className="bg-danger text-white hover:bg-danger/90"
					>
						{deleting && (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						)}
						Delete Project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
