import express from "express";
import {
	generateSprintReport,
	listSprintReports,
	getSprintReport,
	uploadDevUpdateImage,
} from "../controllers/sprint-report.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/sprint-reports", requireAuth, listSprintReports);
router.get("/sprint-reports/:id", requireAuth, getSprintReport);
router.post("/sprint-reports", requireAuth, generateSprintReport);
router.post("/sprint-reports/upload-image", requireAuth, uploadDevUpdateImage);

export default router;
