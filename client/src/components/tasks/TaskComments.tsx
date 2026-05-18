import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { getInitials, profileColorClass } from "./types";
import {
	type TaskComment,
	listTaskComments,
	createTaskComment,
	deleteTaskComment,
} from "@/services/task-comment.service";

interface Props {
	projectId: string;
	taskId: string;
}

interface Thread {
	root: TaskComment;
	replies: TaskComment[];
}

function timeAgo(iso: string): string {
	try {
		return formatDistanceToNow(new Date(iso), { addSuffix: true });
	} catch {
		return iso;
	}
}

function buildThreads(comments: TaskComment[]): Thread[] {
	const roots = comments.filter((c) => !c.parent_comment_id);
	const repliesByParent = new Map<string, TaskComment[]>();
	for (const c of comments) {
		if (!c.parent_comment_id) continue;
		const list = repliesByParent.get(c.parent_comment_id) ?? [];
		list.push(c);
		repliesByParent.set(c.parent_comment_id, list);
	}
	return roots
		.sort(
			(a, b) =>
				new Date(a.created_at).getTime() -
				new Date(b.created_at).getTime(),
		)
		.map((root) => ({
			root,
			replies: (repliesByParent.get(root.id) ?? []).sort(
				(a, b) =>
					new Date(a.created_at).getTime() -
					new Date(b.created_at).getTime(),
			),
		}));
}

export function TaskComments({ projectId, taskId }: Props) {
	const { user } = useAuth();
	const { can } = usePermission();
	const canComment = can("Create & edit tasks");
	const [items, setItems] = useState<TaskComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [body, setBody] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [replyTo, setReplyTo] = useState<string | null>(null);
	const [replyBody, setReplyBody] = useState("");
	const [replySubmitting, setReplySubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		listTaskComments(projectId, taskId)
			.then((data) => {
				if (active) setItems(data);
			})
			.catch((e: unknown) => {
				if (active) {
					toast.error("Failed to load comments", {
						description: (e as Error).message,
					});
					setItems([]);
				}
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [projectId, taskId]);

	const threads = useMemo(() => buildThreads(items), [items]);

	async function handleSubmit() {
		const trimmed = body.trim();
		if (!trimmed) return;
		setSubmitting(true);
		try {
			const created = await createTaskComment(
				projectId,
				taskId,
				trimmed,
				null,
			);
			setItems((prev) => [...prev, created]);
			setBody("");
		} catch (e) {
			toast.error("Failed to post comment", {
				description: (e as Error).message,
			});
		} finally {
			setSubmitting(false);
		}
	}

	async function handleReply(parentId: string) {
		const trimmed = replyBody.trim();
		if (!trimmed) return;
		setReplySubmitting(true);
		try {
			const created = await createTaskComment(
				projectId,
				taskId,
				trimmed,
				parentId,
			);
			setItems((prev) => [...prev, created]);
			setReplyBody("");
			setReplyTo(null);
		} catch (e) {
			toast.error("Failed to post reply", {
				description: (e as Error).message,
			});
		} finally {
			setReplySubmitting(false);
		}
	}

	async function handleDelete(c: TaskComment) {
		if (!window.confirm("Delete this comment?")) return;
		setDeletingId(c.id);
		try {
			await deleteTaskComment(projectId, taskId, c.id);
			setItems((prev) =>
				prev.filter(
					(x) => x.id !== c.id && x.parent_comment_id !== c.id,
				),
			);
		} catch (e) {
			toast.error("Failed to delete comment", {
				description: (e as Error).message,
			});
		} finally {
			setDeletingId(null);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-6">
				<Loader2 className="h-5 w-5 animate-spin text-muted" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{threads.length === 0 && (
				<p className="text-xs text-muted italic">No comments yet.</p>
			)}
			{threads.map((thread) => (
				<div key={thread.root.id} className="space-y-2">
					<CommentRow
						comment={thread.root}
						currentUserId={user?.id ?? null}
						canReply={canComment}
						deleting={deletingId === thread.root.id}
						onReply={() => {
							setReplyTo(thread.root.id);
							setReplyBody("");
						}}
						onDelete={() => handleDelete(thread.root)}
					/>
					{thread.replies.length > 0 && (
						<div className="ml-10 space-y-2 border-l border-border pl-3">
							{thread.replies.map((r) => (
								<CommentRow
									key={r.id}
									comment={r}
									currentUserId={user?.id ?? null}
									canReply={false}
									deleting={deletingId === r.id}
									onReply={() => {}}
									onDelete={() => handleDelete(r)}
								/>
							))}
						</div>
					)}
					{replyTo === thread.root.id && canComment && (
						<div className="ml-10 pl-3 border-l border-border">
							<ReplyComposer
								value={replyBody}
								submitting={replySubmitting}
								onChange={setReplyBody}
								onCancel={() => {
									setReplyTo(null);
									setReplyBody("");
								}}
								onSubmit={() => handleReply(thread.root.id)}
							/>
						</div>
					)}
				</div>
			))}

			{canComment && (
				<div className="pt-2">
					<RootComposer
						value={body}
						submitting={submitting}
						onChange={setBody}
						onSubmit={handleSubmit}
					/>
				</div>
			)}
		</div>
	);
}

function CommentRow({
	comment,
	currentUserId,
	canReply,
	deleting,
	onReply,
	onDelete,
}: {
	comment: TaskComment;
	currentUserId: string | null;
	canReply: boolean;
	deleting: boolean;
	onReply: () => void;
	onDelete: () => void;
}) {
	const author = comment.author;
	const isOwn = author?.id === currentUserId;
	const initials = getInitials(author?.full_name ?? author?.email);
	const color = author ? profileColorClass(author.id) : "bg-muted";

	return (
		<div className="flex items-start gap-2.5">
			<Avatar className="h-7 w-7 shrink-0">
				{author?.avatar_url ? (
					<AvatarImage src={author.avatar_url} />
				) : null}
				<AvatarFallback className={cn("text-[10px] text-white", color)}>
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 text-xs">
					<span className="font-semibold text-foreground truncate">
						{author?.full_name || author?.email || "Unknown"}
					</span>
					<span className="text-muted">
						{timeAgo(comment.created_at)}
					</span>
				</div>
				<p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
					{comment.body}
				</p>
				<div className="flex items-center gap-3 mt-1">
					{canReply && (
						<button
							type="button"
							onClick={onReply}
							className="text-xs! text-muted hover:text-primary inline-flex items-center gap-1"
						>
							<Reply className="h-3 w-3" />
							<span className="text-xs">Reply</span>
						</button>
					)}
					{isOwn && (
						<button
							type="button"
							onClick={onDelete}
							disabled={deleting}
							className="text-xs! text-muted hover:text-danger inline-flex items-center gap-1 disabled:opacity-50"
						>
							{deleting ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<Trash2 className="h-3 w-3" />
							)}
							<span className="text-xs">Delete</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function RootComposer({
	value,
	submitting,
	onChange,
	onSubmit,
}: {
	value: string;
	submitting: boolean;
	onChange: (v: string) => void;
	onSubmit: () => void;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	return (
		<div className="flex flex-col gap-2">
			<textarea
				ref={ref}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Add a comment..."
				rows={2}
				className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
			/>
			<div className="flex justify-end">
				<Button
					size="sm"
					onClick={onSubmit}
					disabled={submitting || !value.trim()}
				>
					{submitting && (
						<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
					)}
					Comment
				</Button>
			</div>
		</div>
	);
}

function ReplyComposer({
	value,
	submitting,
	onChange,
	onCancel,
	onSubmit,
}: {
	value: string;
	submitting: boolean;
	onChange: (v: string) => void;
	onCancel: () => void;
	onSubmit: () => void;
}) {
	return (
		<div className="flex flex-col gap-2 pt-2">
			<textarea
				autoFocus
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Write a reply..."
				rows={2}
				className="w-full text-sm! rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
			/>
			<div className="flex justify-end gap-2">
				<Button
					size="sm"
					variant="ghost"
					onClick={onCancel}
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button
					size="sm"
					onClick={onSubmit}
					disabled={submitting || !value.trim()}
				>
					{submitting && (
						<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
					)}
					Reply
				</Button>
			</div>
		</div>
	);
}
