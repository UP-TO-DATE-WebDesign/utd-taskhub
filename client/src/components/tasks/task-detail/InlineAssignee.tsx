import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type Profile } from "@/services/profile.service";
import { type UiTask, getInitials, profileColorClass } from "../types";
import { UNASSIGNED_VALUE } from "./constants";
import { reportError } from "./utils";

export function InlineAssignee({
	assignee,
	profiles,
	canEdit,
	onSave,
}: {
	assignee: UiTask["assigned_to"];
	profiles: Profile[];
	canEdit: boolean;
	onSave: (v: string | null) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const currentId = assignee?.id ?? "";

	async function pick(v: string) {
		const next = v === UNASSIGNED_VALUE ? null : v;
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

	const readView = assignee ? (
		<div className="flex items-center gap-2">
			<Avatar className="h-8 w-8">
				<AvatarFallback
					className={`text-[10px] text-white ${profileColorClass(assignee.id)}`}
				>
					{getInitials(assignee.full_name ?? assignee.email)}
				</AvatarFallback>
			</Avatar>
			<span className="text-sm font-medium text-foreground truncate">
				{assignee.full_name ?? assignee.email}
			</span>
		</div>
	) : (
		<p className="text-sm text-muted">Unassigned</p>
	);

	if (!canEdit) return readView;

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="flex items-center gap-2 w-full text-left cursor-pointer rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors"
			>
				{readView}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Select
				defaultOpen
				value={currentId || UNASSIGNED_VALUE}
				onValueChange={pick}
				onOpenChange={(o) => {
					if (!o) setEditing(false);
				}}
			>
				<SelectTrigger className="h-8 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
					{profiles.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.full_name ?? p.email}
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
