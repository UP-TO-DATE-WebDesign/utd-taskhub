import express from "express";
import {
	getTasks,
	getTaskById,
	createTask,
	updateTask,
	deleteTask,
	moveTask,
} from "../controllers/task.controller.js";
import {
	makeGetComments,
	makeCreateComment,
	makeUpdateComment,
	makeDeleteComment,
} from "../controllers/comment.controller.js";
import {
	listAttachments,
	createAttachment,
	deleteAttachment,
} from "../controllers/task-attachment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireProjectMember } from "../middlewares/project.middleware.js";
import { requireProjectPermission } from "../middlewares/permission.middleware.js";

const router = express.Router({ mergeParams: true });

router.get(
	"/",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.read"),
	getTasks,
);

router.get(
	"/:taskId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.read"),
	getTaskById,
);

router.post(
	"/",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.create"),
	createTask,
);

router.patch(
	"/:taskId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.update"),
	updateTask,
);

router.delete(
	"/:taskId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.delete"),
	deleteTask,
);

router.patch(
	"/:taskId/move",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.move"),
	moveTask,
);

router.get(
	"/:taskId/comments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("comments.read"),
	makeGetComments("taskId"),
);
router.post(
	"/:taskId/comments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("comments.create"),
	makeCreateComment("taskId"),
);
router.patch(
	"/:taskId/comments/:commentId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("comments.update_own"),
	makeUpdateComment("taskId"),
);
router.delete(
	"/:taskId/comments/:commentId",
	requireAuth,
	requireProjectMember,
	makeDeleteComment("taskId"),
);

router.get(
	"/:taskId/attachments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.read"),
	listAttachments,
);
router.post(
	"/:taskId/attachments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.update"),
	createAttachment,
);
router.delete(
	"/:taskId/attachments/:attachmentId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tasks.update"),
	deleteAttachment,
);

export default router;
