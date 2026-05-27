import { supabase } from "../config/supabase.js";
import { userHasProjectPermission } from "../middlewares/permission.middleware.js";
import { validateCreateComment, validateUpdateComment } from "../utils/comment.validator.js";
import {
	logActivity,
	resolveProjectIdFromTaskOrTicket,
} from "../services/activity-log.service.js";
import {
	createNotifications,
	NotificationType,
} from "../services/notification.service.js";

async function sanitizeMentions(ids, projectId, authorId) {
	if (!Array.isArray(ids) || ids.length === 0 || !projectId) return [];
	const unique = [...new Set(ids.filter(Boolean))].filter((id) => id !== authorId);
	if (unique.length === 0) return [];

	const { data, error } = await supabase
		.from("project_members")
		.select("user_id")
		.eq("project_id", projectId)
		.in("user_id", unique);

	if (error) {
		console.error("[mentions] sanitize failed:", error.message);
		return [];
	}
	return data.map((row) => row.user_id);
}

function snippet(body) {
	if (!body) return "";
	const trimmed = String(body).replace(/\s+/g, " ").trim();
	return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

const COMMENT_SELECT = `
	id,
	body,
	task_id,
	ticket_id,
	parent_comment_id,
	mentioned_user_ids,
	created_at,
	updated_at,
	author:profiles!comments_created_by_fkey (
		id,
		full_name,
		email,
		avatar_url
	)
`;

// parentIdParam: 'taskId' | 'ticketId'
function getColumn(parentIdParam) {
	return parentIdParam === "taskId" ? "task_id" : "ticket_id";
}

export function makeGetComments(parentIdParam) {
	return async function (req, res, next) {
		try {
			const parentId = req.params[parentIdParam];
			const column = getColumn(parentIdParam);

			const { data, error } = await supabase
				.from("comments")
				.select(COMMENT_SELECT)
				.eq(column, parentId)
				.order("created_at", { ascending: true });

			if (error) throw error;

			res.status(200).json({ success: true, count: data.length, data });
		} catch (error) {
			next(error);
		}
	};
}

export function makeCreateComment(parentIdParam) {
	return async function (req, res, next) {
		try {
			const parentId = req.params[parentIdParam];
			const column = getColumn(parentIdParam);

			const errors = validateCreateComment(req.body);
			if (errors.length > 0) {
				return res.status(400).json({ success: false, message: "Validation failed.", errors });
			}

			const parentCommentId = req.body.parent_comment_id ?? null;
			if (parentCommentId) {
				const { data: parentComment, error: parentLookupError } =
					await supabase
						.from("comments")
						.select("id, parent_comment_id, " + column)
						.eq("id", parentCommentId)
						.maybeSingle();
				if (parentLookupError) throw parentLookupError;
				if (!parentComment || parentComment[column] !== parentId) {
					return res.status(400).json({
						success: false,
						message: "Parent comment not found on this thread.",
					});
				}
				if (parentComment.parent_comment_id) {
					return res.status(400).json({
						success: false,
						message: "Replies are limited to one level.",
					});
				}
			}

			const projectId = await resolveProjectIdFromTaskOrTicket({
				taskId: parentIdParam === "taskId" ? parentId : null,
				ticketId: parentIdParam === "ticketId" ? parentId : null,
			});

			const sanitizedMentions = await sanitizeMentions(
				req.body.mentioned_user_ids,
				projectId,
				req.profile.id,
			);

			const { data, error } = await supabase
				.from("comments")
				.insert({
					[column]: parentId,
					body: req.body.body.trim(),
					parent_comment_id: parentCommentId,
					created_by: req.profile.id,
					mentioned_user_ids: sanitizedMentions,
				})
				.select(COMMENT_SELECT)
				.single();

			if (error) throw error;

			(async () => {
				if (projectId) {
					logActivity({
						projectId,
						actorId: req.profile.id,
						entityType: "comment",
						entityId: data.id,
						action: "comment.created",
						metadata: {
							snippet: snippet(data.body),
							task_id: data.task_id,
							ticket_id: data.ticket_id,
						},
					});
				}
				if (sanitizedMentions.length) {
					createNotifications({
						userIds: sanitizedMentions,
						type: NotificationType.COMMENT_MENTION,
						title: `${req.profile.full_name || req.profile.email} mentioned you`,
						body: snippet(data.body),
						data: {
							task_id: data.task_id,
							ticket_id: data.ticket_id,
							comment_id: data.id,
							project_id: projectId,
						},
					});
				}
			})();

			res.status(201).json({ success: true, message: "Comment created successfully.", data });
		} catch (error) {
			next(error);
		}
	};
}

export function makeUpdateComment(parentIdParam) {
	return async function (req, res, next) {
		try {
			const parentId = req.params[parentIdParam];
			const { commentId } = req.params;
			const column = getColumn(parentIdParam);

			const errors = validateUpdateComment(req.body);
			if (errors.length > 0) {
				return res.status(400).json({ success: false, message: "Validation failed.", errors });
			}

			const hasBody = req.body.body !== undefined;
			const hasMentions = req.body.mentioned_user_ids !== undefined;
			if (!hasBody && !hasMentions) {
				return res.status(400).json({ success: false, message: "No valid fields provided for update." });
			}

			const { data: existing, error: findError } = await supabase
				.from("comments")
				.select("id, created_by, mentioned_user_ids")
				.eq("id", commentId)
				.eq(column, parentId)
				.maybeSingle();

			if (findError) throw findError;

			if (!existing) {
				return res.status(404).json({ success: false, message: "Comment not found." });
			}

			if (existing.created_by !== req.profile.id) {
				return res.status(403).json({ success: false, message: "You can only edit your own comments." });
			}

			const projectId = await resolveProjectIdFromTaskOrTicket({
				taskId: parentIdParam === "taskId" ? parentId : null,
				ticketId: parentIdParam === "ticketId" ? parentId : null,
			});

			const updatePayload = {};
			if (hasBody) updatePayload.body = req.body.body.trim();
			let sanitizedMentions = null;
			if (hasMentions) {
				sanitizedMentions = await sanitizeMentions(
					req.body.mentioned_user_ids,
					projectId,
					req.profile.id,
				);
				updatePayload.mentioned_user_ids = sanitizedMentions;
			}

			const { data, error } = await supabase
				.from("comments")
				.update(updatePayload)
				.eq("id", commentId)
				.select(COMMENT_SELECT)
				.single();

			if (error) throw error;

			const prevMentions = Array.isArray(existing.mentioned_user_ids)
				? existing.mentioned_user_ids
				: [];
			const newlyMentioned = sanitizedMentions
				? sanitizedMentions.filter((id) => !prevMentions.includes(id))
				: [];

			(async () => {
				if (projectId) {
					logActivity({
						projectId,
						actorId: req.profile.id,
						entityType: "comment",
						entityId: data.id,
						action: "comment.updated",
						metadata: {
							snippet: snippet(data.body),
							task_id: data.task_id,
							ticket_id: data.ticket_id,
						},
					});
				}
				if (newlyMentioned.length) {
					createNotifications({
						userIds: newlyMentioned,
						type: NotificationType.COMMENT_MENTION,
						title: `${req.profile.full_name || req.profile.email} mentioned you`,
						body: snippet(data.body),
						data: {
							task_id: data.task_id,
							ticket_id: data.ticket_id,
							comment_id: data.id,
							project_id: projectId,
						},
					});
				}
			})();

			res.status(200).json({ success: true, message: "Comment updated successfully.", data });
		} catch (error) {
			next(error);
		}
	};
}

export function makeDeleteComment(parentIdParam) {
	return async function (req, res, next) {
		try {
			const parentId = req.params[parentIdParam];
			const { commentId } = req.params;
			const column = getColumn(parentIdParam);

			const { data: existing, error: findError } = await supabase
				.from("comments")
				.select("id, created_by")
				.eq("id", commentId)
				.eq(column, parentId)
				.maybeSingle();

			if (findError) throw findError;

			if (!existing) {
				return res.status(404).json({ success: false, message: "Comment not found." });
			}

			const projectId = req.params.projectId || req.params.id;
			const isAuthor =
				existing.created_by === req.profile.id &&
				await userHasProjectPermission(req, projectId, "comments.delete_own");
			const isPrivileged = await userHasProjectPermission(
				req,
				projectId,
				"comments.moderate"
			);

			if (!isAuthor && !isPrivileged) {
				return res.status(403).json({ success: false, message: "You do not have permission to delete this comment." });
			}

			const { error } = await supabase.from("comments").delete().eq("id", commentId);
			if (error) throw error;

			(async () => {
				const resolvedProjectId =
					projectId ||
					(await resolveProjectIdFromTaskOrTicket({
						taskId: parentIdParam === "taskId" ? parentId : null,
						ticketId: parentIdParam === "ticketId" ? parentId : null,
					}));
				if (resolvedProjectId) {
					logActivity({
						projectId: resolvedProjectId,
						actorId: req.profile.id,
						entityType: "comment",
						entityId: commentId,
						action: "comment.deleted",
						metadata: {
							task_id: parentIdParam === "taskId" ? parentId : null,
							ticket_id: parentIdParam === "ticketId" ? parentId : null,
						},
					});
				}
			})();

			res.status(200).json({ success: true, message: "Comment deleted successfully." });
		} catch (error) {
			next(error);
		}
	};
}
