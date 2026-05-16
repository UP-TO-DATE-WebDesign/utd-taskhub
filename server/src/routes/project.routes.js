import express from "express";
import {
	getProjects,
	getProjectById,
	createProject,
	updateProject,
	deleteProject,
} from "../controllers/project.controller.js";
import {
	sendInvitation,
	listInvitations,
	cancelInvitation,
} from "../controllers/invitation.controller.js";
import { listProjectActivity } from "../controllers/project-activity.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
	requireProjectMember,
} from "../middlewares/project.middleware.js";
import {
	requirePermission,
	requireProjectPermission,
} from "../middlewares/permission.middleware.js";

const router = express.Router();

// Project CRUD
router.get("/", requireAuth, getProjects);
router.get("/:id", requireAuth, requireProjectMember, getProjectById);
router.post("/", requireAuth, requirePermission("projects.create"), createProject);
router.patch(
	"/:id",
		requireAuth,
		requireProjectMember,
		requireProjectPermission("project.update"),
		updateProject
	);
router.delete(
	"/:id",
		requireAuth,
		requireProjectMember,
		requireProjectPermission("project.delete"),
		deleteProject
	);

// Project invitations
router.get(
	"/:id/invitations",
		requireAuth,
		requireProjectMember,
		requireProjectPermission("invitations.read"),
		listInvitations
	);
router.post(
	"/:id/invitations",
		requireAuth,
		requireProjectMember,
		requireProjectPermission("invitations.manage"),
		sendInvitation
	);
router.delete(
	"/:id/invitations/:invitationId",
		requireAuth,
		requireProjectMember,
		requireProjectPermission("invitations.manage"),
		cancelInvitation
	);

// Project activity feed
router.get(
	"/:id/activity",
	requireAuth,
	requireProjectMember,
	listProjectActivity,
);

export default router;
