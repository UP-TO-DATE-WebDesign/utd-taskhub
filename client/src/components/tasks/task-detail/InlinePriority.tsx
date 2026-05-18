import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type ApiTaskPriority } from "@/services/task.service";
import { cn } from "@/lib/utils";
import { PRIORITY_CHIP, PRIORITY_LABEL, PRIORITY_OPTIONS } from "./constants";
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

	if (!canEdit) {
		return (
			<span
				className={cn(
					"text-[10px] font-bold tracking-wider px-2 py-1 rounded",
					PRIORITY_CHIP[value],
				)}
			>
				{PRIORITY_LABEL[value]}
			</span>
		);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className={cn(
					"text-[10px]! font-bold! tracking-wider px-3 py-1 rounded-xl cursor-pointer hover:opacity-80 transition-opacity",
					PRIORITY_CHIP[value],
				)}
			>
				{PRIORITY_LABEL[value]}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-1.5">
			<Select
				defaultOpen
				value={value}
				onValueChange={(v) => pick(v as ApiTaskPriority)}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-6 text-[10px]! text-center! px-2 py-1 min-w-35">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{PRIORITY_OPTIONS.map((p) => (
						<SelectItem key={p} value={p}>
							{PRIORITY_LABEL[p]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{saving && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
		</div>
	);
}
