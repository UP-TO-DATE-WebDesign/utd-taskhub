import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reportError } from "./utils";

export function InlineDueDate({
	value,
	canEdit,
	onSave,
}: {
	value: string | null;
	canEdit: boolean;
	onSave: (v: string | null) => Promise<void>;
}) {
	const initial = value ? value.slice(0, 10) : "";
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(initial);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(initial);
	}, [initial]);

	async function commit() {
		if (draft === initial) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(draft || null);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(initial);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(initial);
		setEditing(false);
	}

	const label = value ? format(new Date(value), "MMM d, yyyy") : "—";

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"flex items-center gap-2 text-sm text-foreground w-full text-left",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				<Calendar className="h-4 w-4 text-muted" />
				{label}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Input
				type="date"
				autoFocus
				value={draft}
				disabled={saving}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					} else if (e.key === "Escape") {
						e.preventDefault();
						e.stopPropagation();
						cancel();
					}
				}}
				className="h-8 text-xs"
			/>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}
