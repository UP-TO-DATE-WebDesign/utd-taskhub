import { useMemo, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	SearchableSelect,
	type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useAuth } from "@/context/AuthContext";
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
	const { user } = useAuth();
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const currentId = assignee?.id ?? "";
	const isMe = !!user && user.id === currentId;
	const canAssignMe =
		canEdit && !!user && !isMe && profiles.some((p) => p.id === user.id);

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

	async function assignToMe(e: React.MouseEvent) {
		e.stopPropagation();
		if (!user || saving) return;
		setSaving(true);
		try {
			await onSave(user.id);
		} catch (err) {
			reportError(err);
		} finally {
			setSaving(false);
		}
	}

	const options: SearchableSelectOption[] = useMemo(
		() => [
			{ value: UNASSIGNED_VALUE, label: "Unassigned" },
			...profiles.map((p) => ({
				value: p.id,
				label: p.full_name ?? p.email,
				description: p.full_name ? p.email : undefined,
			})),
		],
		[profiles],
	);

	const readView = assignee ? (
		<div className="flex items-center gap-2">
			<Avatar className="h-8 w-8">
				{assignee.avatar_url ? (
					<AvatarImage
						src={assignee.avatar_url}
						alt={assignee.full_name ?? assignee.email}
					/>
				) : null}
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
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setEditing(true)}
					className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors"
				>
					{readView}
				</button>
				{canAssignMe && (
					<button
						type="button"
						onClick={assignToMe}
						disabled={saving}
						title="Assign to me"
						className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50 shrink-0"
					>
						{saving ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<UserCheck className="h-3 w-3" />
						)}
						Me
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 flex-1 min-w-0">
			<div className="flex-1 min-w-0">
				<SearchableSelect
					defaultMenuIsOpen
					autoFocus
					size="sm"
					value={currentId || UNASSIGNED_VALUE}
					onValueChange={(v) => pick(v || UNASSIGNED_VALUE)}
					onMenuClose={() => setEditing(false)}
					options={options}
					placeholder="Unassigned"
				/>
			</div>
			{saving && (
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
			)}
		</div>
	);
}
