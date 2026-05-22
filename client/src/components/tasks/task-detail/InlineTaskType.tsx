import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Icon, type IconName } from "@/components/ui/icon-picker";
import { listTaskTypes, type TaskType } from "@/services/task-type.service";
import type { TaskTypeRef } from "@/services/task.service";
import { reportError } from "./utils";

export function InlineTaskType({
	value,
	canEdit,
	onSave,
}: {
	value: TaskTypeRef | null;
	canEdit: boolean;
	onSave: (id: string | null) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [types, setTypes] = useState<TaskType[]>([]);

	useEffect(() => {
		if (!editing) return;
		let active = true;
		listTaskTypes()
			.then((data) => {
				if (active) setTypes(data);
			})
			.catch(() => {
				if (active) setTypes([]);
			});
		return () => {
			active = false;
		};
	}, [editing]);

	async function pick(nextId: string) {
		if (!nextId || nextId === value?.id) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(nextId);
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
			setEditing(false);
		}
	}

	const chip = value ? (
		<span
			className="inline-flex items-center gap-1.5 text-base font-medium"
			style={{ color: value.color }}
		>
			<Icon name={value.icon as IconName} className="h-4 w-4" />
			{value.name}
		</span>
	) : (
		<span className="text-[11px] text-muted">No type</span>
	);

	if (!canEdit) return chip;

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="cursor-pointer hover:opacity-80 transition-opacity"
			>
				{chip}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-1.5 min-w-32">
			<div className="flex-1 min-w-0">
				<SearchableSelect<{ color: string; icon: string }>
					defaultMenuIsOpen
					autoFocus
					size="sm"
					value={value?.id ?? ""}
					onValueChange={pick}
					onMenuClose={() => setEditing(false)}
					placeholder="Select type"
					options={types.map((t) => ({
						value: t.id,
						label: t.name,
						meta: { color: t.color, icon: t.icon },
					}))}
					renderOption={(opt) => (
						<span
							className="inline-flex items-center gap-1.5 text-base font-medium"
							style={{ color: opt.meta?.color }}
						>
							<Icon
								name={opt.meta?.icon as IconName}
								className="h-3 w-3"
							/>
							{opt.label}
						</span>
					)}
					renderValue={(opt) => (
						<span
							className="inline-flex items-center gap-1.5 font-medium"
							style={{ color: opt.meta?.color }}
						>
							<Icon
								name={opt.meta?.icon as IconName}
								className="h-3 w-3"
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
