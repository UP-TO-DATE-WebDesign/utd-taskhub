import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
	ProjectDescriptionEditor,
	ProjectDescriptionPreview,
} from "@/components/projects/project-description";
import { projectDescriptionText } from "@/components/projects/project-description-utils";
import { cn } from "@/lib/utils";
import { reportError } from "./utils";

export function InlineDescription({
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
		if (saving) return;
		if (draft === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(draft);
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

	const hasText = projectDescriptionText(value);

	if (!editing) {
		return (
			<div
				onClick={() => canEdit && setEditing(true)}
				className={cn(
					"text-sm leading-relaxed",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				{hasText ? (
					<div className="text-stone-600">
						<ProjectDescriptionPreview value={value} />
					</div>
				) : (
					<p className="text-muted italic">
						No description provided.
					</p>
				)}
			</div>
		);
	}

	return (
		<div
			className="relative shadow-[0px_0px_4px_0px_rgba(0,0,0,0.1),0px_0px_0px_1px_rgba(0,0,0,0.1)] p-2 rounded-xs	"
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					e.stopPropagation();
					cancel();
				}
			}}
		>
			<ProjectDescriptionEditor
				inline
				autoFocus
				value={draft}
				onChange={setDraft}
				onBlur={commit}
				placeholder="Describe the task..."
			/>
			{saving && (
				<Loader2 className="absolute right-1 top-1 h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}
