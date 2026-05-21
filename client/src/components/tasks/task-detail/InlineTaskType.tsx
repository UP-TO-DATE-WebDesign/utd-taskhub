import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
		if (nextId === value?.id) {
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
		<div className="flex items-center gap-1.5">
			<Select
				defaultOpen
				value={value?.id ?? ""}
				onValueChange={pick}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-7 text-xs min-w-32">
					<SelectValue placeholder="Select type" />
				</SelectTrigger>
				<SelectContent>
					{types.map((t) => (
						<SelectItem key={t.id} value={t.id}>
							<span
								className="inline-flex items-center gap-1.5 text-base font-medium"
								style={{ color: t.color }}
							>
								<Icon
									name={t.icon as IconName}
									className="h-3 w-3"
								/>
								{t.name}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
		</div>
	);
}
