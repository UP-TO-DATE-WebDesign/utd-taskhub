import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type Project } from "@/services/project.service";
import { reportError } from "./utils";

export function InlineProject({
	projectId,
	projects,
	canEdit,
	locked,
	onSave,
}: {
	projectId: string;
	projects: Project[];
	canEdit: boolean;
	locked?: boolean;
	onSave: (v: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const current = projects.find((p) => p.id === projectId);

	async function pick(v: string) {
		if (v === projectId) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(v);
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
			setEditing(false);
		}
	}

	const readView = (
		<span className="text-sm font-medium text-foreground">
			{current?.name ?? "—"}
		</span>
	);

	if (!canEdit || locked) return readView;

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="text-left cursor-pointer rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors w-full"
			>
				{readView}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Select
				defaultOpen
				value={projectId}
				onValueChange={pick}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue placeholder="Select project" />
				</SelectTrigger>
				<SelectContent>
					{projects.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}
