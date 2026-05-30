import { useEffect, useState } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { listSprints, type Sprint } from "@/services/sprint.service";
import { generateSprintReport } from "@/services/dev-updates.service";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onGenerated: () => void;
}

export default function GenerateDevUpdatesModal({
	open,
	onOpenChange,
	onGenerated,
}: Props) {
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [sprintId, setSprintId] = useState("");
	const [loadingSprints, setLoadingSprints] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		let mounted = true;
		(async () => {
			try {
				setLoadingSprints(true);
				setError(null);
				const data = await listSprints();
				if (mounted) setSprints(data);
			} catch (err) {
				if (mounted)
					setError(err instanceof Error ? err.message : "Failed to load sprints");
			} finally {
				if (mounted) setLoadingSprints(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [open]);

	async function handleGenerate() {
		if (!sprintId) return;
		try {
			setGenerating(true);
			setError(null);
			await generateSprintReport(sprintId);
			onGenerated();
			onOpenChange(false);
			setSprintId("");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate dev updates",
			);
		} finally {
			setGenerating(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Generate Dev Updates</DialogTitle>
				</DialogHeader>

				{error && (
					<div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<div className="space-y-2">
					<label className="text-sm font-medium text-foreground">
						Select a sprint
					</label>
					<select
						value={sprintId}
						onChange={(e) => setSprintId(e.target.value)}
						disabled={loadingSprints || generating}
						className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
					>
						<option value="">
							{loadingSprints ? "Loading sprints…" : "Select a sprint…"}
						</option>
						{sprints.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name} ({s.status})
							</option>
						))}
					</select>
					<p className="text-xs text-muted">
						Builds dev updates from the sprint's completed tasks and closed
						tickets, then bulk-imports them to the Dev Updates API.
					</p>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={generating}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleGenerate}
						disabled={!sprintId || generating}
					>
						{generating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
						Generate
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
