import express from "express";
import {
	getTickets,
	getTicketById,
	createTicket,
	updateTicket,
	closeTicket,
	deleteTicket,
	convertTicketToTask,
	checkTicketCode,
	getNextTicketCode,
} from "../controllers/ticket.controller.js";
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
} from "../controllers/ticket-attachment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
	requireProjectMember,
} from "../middlewares/project.middleware.js";
import { requireProjectPermission } from "../middlewares/permission.middleware.js";

const router = express.Router({ mergeParams: true });

router.get("/", requireAuth, requireProjectMember, requireProjectPermission("tickets.read"), getTickets);

router.get("/check-code", requireAuth, requireProjectMember, requireProjectPermission("tickets.read"), checkTicketCode);

router.get("/next-code", requireAuth, requireProjectMember, requireProjectPermission("tickets.read"), getNextTicketCode);

router.get("/:ticketId", requireAuth, requireProjectMember, requireProjectPermission("tickets.read"), getTicketById);

router.post("/", requireAuth, requireProjectMember, requireProjectPermission("tickets.create"), createTicket);

router.patch(
	"/:ticketId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.update"),
	updateTicket
);

router.post(
	"/:ticketId/close",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.update"),
	closeTicket
);

router.delete(
	"/:ticketId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.delete"),
	deleteTicket
);

router.post(
	"/:ticketId/convert",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.convert"),
	convertTicketToTask
);

router.get(
	"/:ticketId/attachments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.read"),
	listAttachments
);
router.post(
	"/:ticketId/attachments",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.update"),
	createAttachment
);
router.delete(
	"/:ticketId/attachments/:attachmentId",
	requireAuth,
	requireProjectMember,
	requireProjectPermission("tickets.update"),
	deleteAttachment
);

router.get("/:ticketId/comments", requireAuth, requireProjectMember, requireProjectPermission("comments.read"), makeGetComments("ticketId"));
router.post("/:ticketId/comments", requireAuth, requireProjectMember, requireProjectPermission("comments.create"), makeCreateComment("ticketId"));
router.patch("/:ticketId/comments/:commentId", requireAuth, requireProjectMember, requireProjectPermission("comments.update_own"), makeUpdateComment("ticketId"));
router.delete("/:ticketId/comments/:commentId", requireAuth, requireProjectMember, makeDeleteComment("ticketId"));

export default router;
