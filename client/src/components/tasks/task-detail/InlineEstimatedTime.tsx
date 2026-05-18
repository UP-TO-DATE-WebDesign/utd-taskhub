import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime, TIME_INCREMENTS } from "../types";
import { reportError } from "./utils";

export function InlineEstimatedTime({
	value,
	canEdit,
	onSave,
}: {
	value: number;
	canEdit: boolean;
	onSave: (v: number) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [inputMode, setInputMode] = useState(false);
	const [draft, setDraft] = useState(String(value || ""));
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDraft(String(value || ""));
	}, [value]);

	async function commit() {
		const num = parseInt(draft, 10);
		const safe = Number.isFinite(num) && num > 0 ? num : 0;
		if (safe === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(safe);
			setEditing(false);
		} catch (e) {
			reportError(e);
			setDraft(String(value || ""));
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setDraft(String(value || ""));
		setEditing(false);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit}
				className={cn(
					"flex items-center gap-2 text-sm text-foreground w-full text-left",
					canEdit &&
						"cursor-text rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
				)}
			>
				<Clock className="h-4 w-4 text-muted" />
				{value ? formatTime(value) : "—"}
			</button>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-2 bg-white p-2 border rounded-md border-border">
				{inputMode ? (
					<div className="flex flex-col gap-2 pt-2">
						<span className="text-xs absolute mt-2 right-10 text-center">
							min{parseFloat(draft) > 1 ? "s" : ""}
						</span>
						<Input
							autoFocus
							value={draft}
							disabled={saving}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									setInputMode(false);
									commit();
								} else if (e.key === "Escape") {
									e.preventDefault();
									e.stopPropagation();
									setInputMode(false);
									cancel();
								}
							}}
							className="text-sm h-8 text-center"
						/>
					</div>
				) : (
					<div
						className={`text-center text-xl font-bold ${inputMode ? "text-foreground bg-backround" : "text-muted"} cursor-pointer`}
						onClick={() => {
							setInputMode(true);
						}}
						title="click to edit"
					>
						{formatTime(parseFloat(draft))}
					</div>
				)}
				<div className="flex items-center justify-center flex-wrap gap-2">
					{TIME_INCREMENTS.map(({ label, delta }) => (
						<span
							key={label}
							className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
							onClick={() => {
								setDraft(
									draft
										? String(parseFloat(draft) + delta)
										: String(delta),
								);
							}}
						>
							{label}
						</span>
					))}
					<span
						className="text-xs text-accent cursor-pointer shadow-xs border border-reset px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
						onClick={() => setDraft("")}
					>
						Reset
					</span>
				</div>
			</div>
			<div className="flex items-center justify-end pt-2 gap-2">
				<Button
					disabled={saving}
					size="sm"
					variant={"ghost"}
					onClick={cancel}
				>
					<span className="text-xs">Cancel</span>
				</Button>
				<Button
					disabled={saving}
					size="sm"
					variant={"default"}
					onClick={commit}
				>
					<span className="text-xs">Save</span>
				</Button>
			</div>
		</>
	);
}
