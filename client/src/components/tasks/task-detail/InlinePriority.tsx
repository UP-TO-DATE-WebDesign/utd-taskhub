import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { type ApiTaskPriority } from "@/services/task.service";
import {
	PRIORITY_COLOR,
	PRIORITY_LABEL,
	PRIORITY_OPTIONS,
} from "./constants";
import { reportError } from "./utils";

export function InlinePriority({
	value,
	canEdit,
	onSave,
}: {
	value: ApiTaskPriority;
	canEdit: boolean;
	onSave: (v: ApiTaskPriority) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	async function pick(next: ApiTaskPriority) {
		if (next === value) {
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

	const color = PRIORITY_COLOR[value];

	if (!canEdit) {
		return (
			<span
				className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider"
				style={{ color }}
			>
				<span
					className="inline-block h-2 w-2 rounded-full"
					style={{ backgroundColor: color }}
				/>
				{PRIORITY_LABEL[value]}
			</span>
		);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
				style={{ color }}
			>
				<span
					className="inline-block h-2 w-2 rounded-full"
					style={{ backgroundColor: color }}
				/>
				{PRIORITY_LABEL[value]}
			</button>
		);
	}

	const options: SearchableSelectOption<{ color: string }>[] = PRIORITY_OPTIONS.map(
		(p) => ({
			value: p,
			label: PRIORITY_LABEL[p],
			meta: { color: PRIORITY_COLOR[p] },
		}),
	);

	return (
		<div className="flex items-center gap-1.5 min-w-35">
			<div className="flex-1 min-w-0">
				<SearchableSelect<{ color: string }>
					defaultMenuIsOpen
					autoFocus
					size="sm"
					value={value}
					onValueChange={(v) => v && pick(v as ApiTaskPriority)}
					onMenuClose={() => setEditing(false)}
					options={options}
					renderOption={(opt) => (
						<span
							className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider"
							style={{ color: opt.meta?.color }}
						>
							<span
								className="inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: opt.meta?.color }}
							/>
							{opt.label}
						</span>
					)}
					renderValue={(opt) => (
						<span
							className="inline-flex items-center gap-1.5 font-bold tracking-wider"
							style={{ color: opt.meta?.color }}
						>
							<span
								className="inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: opt.meta?.color }}
							/>
							{opt.label}
						</span>
					)}
				/>
			</div>
			{saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
		</div>
	);
}
