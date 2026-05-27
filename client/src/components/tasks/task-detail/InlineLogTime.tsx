import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { formatTime, TIME_INCREMENTS } from "../types";
import { reportError } from "./utils";
import {
	type TimeLog,
	listTimeLogs,
	createTimeLog,
	updateTimeLog,
	deleteTimeLog,
} from "@/services/time-log.service";

interface Props {
	projectId: string;
	taskId: string;
	assigneeId: string | null | undefined;
	onChange?: () => void;
}

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export function InlineLogTime({
	projectId,
	taskId,
	assigneeId,
	onChange,
}: Props) {
	const { user } = useAuth();
	const roleKey = user?.global_role?.key ?? user?.role ?? null;
	const isAdminOrManager = roleKey === "admin" || roleKey === "manager";
	const canLog =
		!!user && !!assigneeId && (user.id === assigneeId || isAdminOrManager);

	const [logs, setLogs] = useState<TimeLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(false);
	const [composing, setComposing] = useState(false);
	const [draftMinutes, setDraftMinutes] = useState("");
	const [draftDate, setDraftDate] = useState(todayIso());
	const [draftNote, setDraftNote] = useState("");
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editMinutes, setEditMinutes] = useState("");
	const [editDate, setEditDate] = useState("");
	const [editNote, setEditNote] = useState("");
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		listTimeLogs(projectId, taskId)
			.then((data) => {
				if (active) setLogs(data);
			})
			.catch(() => {
				if (active) setLogs([]);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [projectId, taskId]);

	const totalMinutes = useMemo(
		() => logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
		[logs],
	);

	function resetCompose() {
		setDraftMinutes("");
		setDraftDate(todayIso());
		setDraftNote("");
		setComposing(false);
	}

	async function submitLog() {
		const minutes = parseInt(draftMinutes, 10);
		if (!Number.isFinite(minutes) || minutes <= 0) {
			toast.error("Enter a positive duration in minutes.");
			return;
		}
		setSaving(true);
		try {
			const created = await createTimeLog(projectId, taskId, {
				duration_minutes: minutes,
				description: draftNote.trim() || null,
				logged_date: draftDate || undefined,
			});
			setLogs((prev) => [created, ...prev]);
			resetCompose();
			setExpanded(true);
			onChange?.();
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
		}
	}

	function startEdit(log: TimeLog) {
		setEditingId(log.id);
		setEditMinutes(String(log.duration_minutes));
		setEditDate(log.logged_date);
		setEditNote(log.description ?? "");
	}

	function cancelEdit() {
		setEditingId(null);
		setEditMinutes("");
		setEditDate("");
		setEditNote("");
	}

	async function saveEdit(logId: string) {
		const minutes = parseInt(editMinutes, 10);
		if (!Number.isFinite(minutes) || minutes <= 0) {
			toast.error("Enter a positive duration in minutes.");
			return;
		}
		setSaving(true);
		try {
			const updated = await updateTimeLog(projectId, taskId, logId, {
				duration_minutes: minutes,
				description: editNote.trim() || null,
				logged_date: editDate || undefined,
			});
			setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
			cancelEdit();
			onChange?.();
		} catch (e) {
			reportError(e);
		} finally {
			setSaving(false);
		}
	}

	async function removeLog(logId: string) {
		setDeletingId(logId);
		try {
			await deleteTimeLog(projectId, taskId, logId);
			setLogs((prev) => prev.filter((l) => l.id !== logId));
			onChange?.();
		} catch (e) {
			reportError(e);
		} finally {
			setDeletingId(null);
		}
	}

	function canTouchLog(log: TimeLog): boolean {
		if (!user) return false;
		if (log.logged_by?.id === user.id) return true;
		if (log.user_id === user.id) return true;
		return isAdminOrManager;
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className={cn(
						"flex items-center gap-2 text-sm text-foreground text-left",
						"rounded -mx-1 px-1 py-0.5 hover:bg-muted-subtle/60 transition-colors",
					)}
				>
					<Clock className="h-4 w-4 text-muted" />
					{loading ? (
						<span className="text-muted">Loading…</span>
					) : (
						<span>{totalMinutes ? formatTime(totalMinutes) : "—"}</span>
					)}
					{logs.length > 0 && (
						<span className="text-xs text-muted">
							({logs.length} {logs.length === 1 ? "entry" : "entries"})
						</span>
					)}
				</button>
				{canLog && !composing && (
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2 text-xs"
						onClick={() => setComposing(true)}
					>
						+ Log
					</Button>
				)}
			</div>

			{!canLog && !loading && assigneeId == null && (
				<p className="text-[11px] text-muted">
					Assign a user to enable time logging.
				</p>
			)}

			{composing && canLog && (
				<div className="flex flex-col gap-2 bg-white p-2 border rounded-md border-border">
					<div className="flex items-center gap-2">
						<Input
							autoFocus
							value={draftMinutes}
							placeholder="Minutes"
							disabled={saving}
							onChange={(e) => setDraftMinutes(e.target.value)}
							className="text-sm h-8 text-center"
						/>
						<Input
							type="date"
							value={draftDate}
							disabled={saving}
							onChange={(e) => setDraftDate(e.target.value)}
							className="text-sm h-8"
							max={todayIso()}
						/>
					</div>
					<div className="flex items-center justify-center flex-wrap gap-1.5">
						{TIME_INCREMENTS.map(({ label, delta }) => (
							<span
								key={label}
								className="text-xs text-secondary cursor-pointer shadow-xs border border-secondary/50 px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
								onClick={() => {
									setDraftMinutes(
										draftMinutes
											? String(
													parseFloat(draftMinutes) +
														delta,
												)
											: String(delta),
									);
								}}
							>
								{label}
							</span>
						))}
						<span
							className="text-xs text-accent cursor-pointer shadow-xs border border-reset px-1.5 py-1 rounded-md hover:bg-primary hover:text-white transition-all duration-200"
							onClick={() => setDraftMinutes("")}
						>
							Reset
						</span>
					</div>
					<textarea
						value={draftNote}
						placeholder="What did you work on? (optional)"
						disabled={saving}
						onChange={(e) => setDraftNote(e.target.value)}
						className="text-xs min-h-[60px] w-full rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
					/>
					<div className="flex items-center justify-end gap-2">
						<Button
							size="sm"
							variant="ghost"
							disabled={saving}
							onClick={resetCompose}
						>
							<span className="text-xs">Cancel</span>
						</Button>
						<Button
							size="sm"
							variant="default"
							disabled={saving}
							onClick={submitLog}
						>
							{saving && (
								<Loader2 className="h-3 w-3 mr-1 animate-spin" />
							)}
							<span className="text-xs">Log Time</span>
						</Button>
					</div>
				</div>
			)}

			{expanded && (
				<div className="border border-border rounded-md divide-y divide-border bg-white">
					{loading ? (
						<div className="px-3 py-3 text-xs text-muted">Loading…</div>
					) : logs.length === 0 ? (
						<div className="px-3 py-3 text-xs text-muted">
							No time logged yet.
						</div>
					) : (
						logs.map((log) => {
							const editable = canTouchLog(log);
							const isEditing = editingId === log.id;
							if (isEditing) {
								return (
									<div
										key={log.id}
										className="px-3 py-2 space-y-2"
									>
										<div className="flex items-center gap-2">
											<Input
												value={editMinutes}
												disabled={saving}
												onChange={(e) =>
													setEditMinutes(
														e.target.value,
													)
												}
												className="h-7 text-xs text-center w-20"
											/>
											<Input
												type="date"
												value={editDate}
												disabled={saving}
												onChange={(e) =>
													setEditDate(e.target.value)
												}
												className="h-7 text-xs flex-1"
												max={todayIso()}
											/>
										</div>
										<textarea
											value={editNote}
											disabled={saving}
											onChange={(e) =>
												setEditNote(e.target.value)
											}
											className="text-xs min-h-[44px] w-full rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
										/>
										<div className="flex items-center justify-end gap-2">
											<Button
												size="sm"
												variant="ghost"
												disabled={saving}
												onClick={cancelEdit}
											>
												<span className="text-xs">
													Cancel
												</span>
											</Button>
											<Button
												size="sm"
												variant="default"
												disabled={saving}
												onClick={() => saveEdit(log.id)}
											>
												{saving && (
													<Loader2 className="h-3 w-3 mr-1 animate-spin" />
												)}
												<span className="text-xs">
													Save
												</span>
											</Button>
										</div>
									</div>
								);
							}
							return (
								<div
									key={log.id}
									className="px-3 py-2 flex items-start gap-2 group"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 text-xs">
											<span className="font-medium text-foreground">
												{formatTime(log.duration_minutes)}
											</span>
											<span className="text-muted">
												{log.logged_date}
											</span>
										</div>
										<div className="text-[11px] text-muted mt-0.5 truncate">
											{log.logged_by?.full_name ??
												log.logged_by?.email ??
												"User"}
											{log.description
												? ` — ${log.description}`
												: ""}
										</div>
									</div>
									{editable && (
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button
												type="button"
												onClick={() => startEdit(log)}
												className="p-1 rounded hover:bg-muted-subtle text-muted hover:text-foreground"
												title="Edit"
											>
												<Pencil className="h-3 w-3" />
											</button>
											<button
												type="button"
												onClick={() => removeLog(log.id)}
												disabled={deletingId === log.id}
												className="p-1 rounded hover:bg-muted-subtle text-muted hover:text-danger"
												title="Delete"
											>
												{deletingId === log.id ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													<Trash2 className="h-3 w-3" />
												)}
											</button>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
