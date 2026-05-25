import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
	listMyApiKeys,
	createMyApiKey,
	revokeMyApiKey,
} from "../controllers/api-key.controller.js";

const router = express.Router();

router.get("/", requireAuth, listMyApiKeys);
router.post("/", requireAuth, createMyApiKey);
router.delete("/:id", requireAuth, revokeMyApiKey);

export default router;
