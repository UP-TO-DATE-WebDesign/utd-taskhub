import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { listProjects, type Project } from "@/services/project.service";
import {
	ALL_SCOPES,
	createApiKey,
	type ApiKeyScope,
	type CreatedApiKey,
} from "@/services/api-key.service";

const SCOPE_LABELS: Record<ApiKeyScope, string> = {
	"tickets:write": "Create tickets",
	"tickets:read": "Read tickets",
	"tasks:write": "Create tasks",
	"tasks:read": "Read tasks",
	"status:update": "Update status (tickets & tasks)",
};

export function CreateApiKeyDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (key: CreatedApiKey) => void;
}) {
	const [projects, setProjects] = useState<Project[]>([]);
	const [loadingProjects, setLoadingProjects] = useState(false);
	const [name, setName] = useState("");
	const [projectId, setProjectId] = useState("");
	const [scopes, setScopes] = useState<ApiKeyScope[]>([
		"tickets:write",
		"tasks:write",
	]);
	const [expiresAt, setExpiresAt] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) return;
		setLoadingProjects(true);
		listProjects()
			.then((p) => setProjects(p))
			.catch(() => toast.error("Failed to load projects."))
			.finally(() => setLoadingProjects(false));
	}, [open]);

	useEffect(() => {
		if (!open) {
			setName("");
			setProjectId("");
			setScopes(["tickets:write", "tasks:write"]);
			setExpiresAt("");
		}
	}, [open]);

	function toggleScope(s: ApiKeyScope) {
		setScopes((curr) =>
			curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s],
		);
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || !projectId || scopes.length === 0) {
			toast.error("Name, project, and at least one scope are required.");
			return;
		}
		setSubmitting(true);
		try {
			const created = await createApiKey({
				name: name.trim(),
				project_id: projectId,
				scopes,
				expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
			});
			onCreated(created);
			onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create API key.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Generate API key</DialogTitle>
					<DialogDescription>
						Bind a key to one project. The key is shown once after creation.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							Name
						</label>
						<Input
							placeholder="e.g. Acme CRM integration"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={50}
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							Project
						</label>
						<select
							value={projectId}
							onChange={(e) => setProjectId(e.target.value)}
							disabled={loadingProjects}
							className="h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground"
						>
							<option value="">
								{loadingProjects ? "Loading…" : "Select a project"}
							</option>
							{projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							Scopes
						</label>
						<div className="space-y-2 rounded-md border border-border p-3">
							{ALL_SCOPES.map((s) => {
								const id = `scope-${s}`;
								return (
									<div
										key={s}
										className="flex items-center gap-2"
									>
										<Checkbox
											id={id}
											checked={scopes.includes(s)}
											onCheckedChange={() => toggleScope(s)}
										/>
										<label
											htmlFor={id}
											className="text-xs text-foreground"
										>
											<span className="font-medium">
												{SCOPE_LABELS[s]}
											</span>
											<span className="ml-2 text-muted-foreground">
												{s}
											</span>
										</label>
									</div>
								);
							})}
						</div>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							Expires at (optional)
						</label>
						<Input
							type="date"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Leave blank for no expiry. You can always revoke a key.
						</p>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm" disabled={submitting}>
							{submitting ? "Generating…" : "Generate key"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
