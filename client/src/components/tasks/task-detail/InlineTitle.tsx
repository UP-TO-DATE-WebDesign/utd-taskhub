import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reportError } from "./utils";

export function InlineTitle({
	value,
	canEdit,
	onSave,
}: {
	value: string;
	canEdit: boolean;
	onSave: (v: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	async function commit() {
		const next = draft.trim();
		if (!next || next === value) {
			setDraft(value);
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(next);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(value);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(value);
		setEditing(false);
	}

	if (!editing) {
		return (
			<h2
				onClick={() => canEdit && setEditing(true)}
				className={cn(
					"text-2xl font-semibold text-foreground tracking-tight mb-2",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{value}
			</h2>
		);
	}

	return (
		<div className="flex items-center gap-2 mb-2">
			<Input
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
				className="text-2xl font-semibold rounded-sm! h-11"
			/>
			{saving && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
		</div>
	);
}
