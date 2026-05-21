import express from "express";
import {
	createWorkflowStage,
	deleteWorkflowStage,
	listWorkflowStages,
	reorderWorkflowStages,
	updateWorkflowStage,
} from "../controllers/workflow-stage.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireProjectMember } from "../middlewares/project.middleware.js";
import { requireProjectPermission } from "../middlewares/permission.middleware.js";

const router = express.Router({ mergeParams: true });

const canManage = [
	requireAuth,
	requireProjectMember,
	requireProjectPermission("columns.manage"),
];

router.get(
	"/",
	requireAuth,
	requireProjectMember,
	listWorkflowStages,
);

router.post("/", ...canManage, createWorkflowStage);
// /reorder must be declared before /:stageId to avoid Express
// treating the literal "reorder" as a stageId value
router.patch("/reorder", ...canManage, reorderWorkflowStages);
router.patch("/:stageId", ...canManage, updateWorkflowStage);
router.delete("/:stageId", ...canManage, deleteWorkflowStage);

export default router;
