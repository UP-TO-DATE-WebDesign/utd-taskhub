import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	STATUS_BADGE,
	getInitials,
	profileColorClass,
	type UiTask,
} from "@/components/tasks/types";
import type { StartActionKind, StartTaskActionState } from "./types";

interface Props {
	task: UiTask;
	value: StartTaskActionState;
	onChange: (next: StartTaskActionState) => void;
	disabled?: boolean;
}

const OPTIONS: { kind: StartActionKind; label: string }[] = [
	{ kind: "move", label: "Move to new sprint" },
	{ kind: "keep", label: "Keep on current sprint" },
];

export function StartSprintTaskRow({
	task,
	value,
	onChange,
	disabled,
}: Props) {
	const badge = STATUS_BADGE[task.apiStatus];
	const assignee = task.assigned_to;
	const initials = getInitials(assignee?.full_name ?? assignee?.email ?? null);
	const avatarColor = assignee ? profileColorClass(assignee.id) : "bg-muted";
	const id = `start-sprint-${task.id}`;

	return (
		<div className="grid grid-cols-[1fr_auto_auto] items-start gap-4 border-b border-border py-3 last:border-b-0">
			<div className="min-w-0">
				<p className="text-sm font-medium text-foreground truncate">
					{task.title}
				</p>
				<div className="mt-1 flex items-center gap-2">
					<Badge variant={badge.variant}>{badge.label}</Badge>
					{task.sprint && (
						<span className="text-[10px] text-muted">
							Sprint: {task.sprint.name}
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0 pt-0.5">
				{assignee ? (
					<>
						<span
							className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white ${avatarColor}`}
						>
							{initials}
						</span>
						<span className="text-xs text-muted max-w-[120px] truncate">
							{assignee.full_name ?? assignee.email}
						</span>
					</>
				) : (
					<span className="text-xs text-muted">Unassigned</span>
				)}
			</div>
			<div className="shrink-0">
				<fieldset className="flex flex-col gap-1">
					<legend className="sr-only">Start sprint task action</legend>
					<RadioGroup
						value={value.kind}
						onValueChange={(v) =>
							onChange({ kind: v as StartActionKind })
						}
						disabled={disabled}
						className="grid gap-1"
					>
						{OPTIONS.map((opt) => {
							const itemId = `${id}-${opt.kind}`;
							return (
								<div key={opt.kind} className="flex items-center gap-2">
									<RadioGroupItem id={itemId} value={opt.kind} />
									<label
										htmlFor={itemId}
										className="text-xs text-foreground cursor-pointer"
									>
										{opt.label}
									</label>
								</div>
							);
						})}
					</RadioGroup>
				</fieldset>
			</div>
		</div>
	);
}
