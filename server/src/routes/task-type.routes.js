import express from "express";
import {
	createTaskType,
	deleteTaskType,
	listTaskTypes,
	updateTaskType,
} from "../controllers/task-type.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listTaskTypes);
router.post("/", requirePermission("roles.manage"), createTaskType);
router.patch("/:id", requirePermission("roles.manage"), updateTaskType);
router.delete("/:id", requirePermission("roles.manage"), deleteTaskType);

export default router;
