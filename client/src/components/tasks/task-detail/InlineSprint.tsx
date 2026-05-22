import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { type Sprint } from "@/services/sprint.service";
import { type UiTask } from "../types";
import { NO_SPRINT_VALUE } from "./constants";
import { reportError } from "./utils";

export function InlineSprint({
	sprint,
	sprints,
	loading,
	canEdit,
	onSave,
}: {
	sprint: UiTask["sprint"];
	sprints: Sprint[];
	loading: boolean;
	canEdit: boolean;
	onSave: (v: string | null) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const currentId = sprint?.id ?? "";

	async function pick(v: string) {
		const next = v === NO_SPRINT_VALUE || !v ? null : v;
		if ((next ?? "") === currentId) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(next);
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
			setEditing(false);
		}
	}

	const readView = (
		<span className="text-sm font-medium text-foreground">
			{sprint?.name ?? "—"}
		</span>
	);

	const options: SearchableSelectOption[] = useMemo(
		() => [
			{ value: NO_SPRINT_VALUE, label: "No sprint" },
			...sprints.map((s) => ({ value: s.id, label: s.name })),
		],
		[sprints],
	);

	if (!canEdit) return readView;

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
			<div className="flex-1 min-w-0">
				<SearchableSelect
					defaultMenuIsOpen
					autoFocus
					size="sm"
					value={currentId || NO_SPRINT_VALUE}
					onValueChange={pick}
					onMenuClose={() => setEditing(false)}
					disabled={loading}
					loading={loading}
					placeholder={loading ? "Loading..." : "Select sprint"}
					options={options}
				/>
			</div>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}
