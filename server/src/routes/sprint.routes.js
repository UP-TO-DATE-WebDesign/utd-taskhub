import express from "express";
import {
	listSprints,
	createSprint,
	updateSprint,
	deleteSprint,
	endSprint,
	startSprint,
} from "../controllers/sprint.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listSprints);
router.post("/", requireAuth, createSprint);
router.patch("/:sprintId", requireAuth, updateSprint);
router.delete("/:sprintId", requireAuth, deleteSprint);
router.post("/:sprintId/end", requireAuth, endSprint);
router.post("/:sprintId/start", requireAuth, startSprint);

export default router;
