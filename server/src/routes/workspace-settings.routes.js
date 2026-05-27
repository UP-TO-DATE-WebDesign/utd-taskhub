import express from "express";
import {
	getSettings,
	updateSettings,
	getFeatureFlags,
} from "../controllers/workspace-settings.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/feature-flags", requireAuth, getFeatureFlags);
router.get("/", requireAuth, getSettings);
router.patch("/", requireAuth, updateSettings);

export default router;
