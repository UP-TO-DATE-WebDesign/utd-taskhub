import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
	listMyApiKeys,
	createMyApiKey,
	revokeMyApiKey,
	getMyApiKey,
} from "../controllers/api-key.controller.js";

const router = express.Router();

router.get("/", requireAuth, listMyApiKeys);
router.post("/", requireAuth, createMyApiKey);
router.get("/:id", requireAuth, getMyApiKey);
router.delete("/:id", requireAuth, revokeMyApiKey);

export default router;
