import express from "express";
import { requireApiKey } from "../middlewares/api-key.middleware.js";
import {
	createTicketExternal,
	getTicketExternal,
	updateTicketStatusExternal,
	createTaskExternal,
	getTaskExternal,
	updateTaskStatusExternal,
} from "../controllers/external.controller.js";

const router = express.Router();

// Tickets
router.post("/tickets", requireApiKey("tickets:write"), createTicketExternal);
router.get("/tickets/:id", requireApiKey("tickets:read"), getTicketExternal);
router.patch(
	"/tickets/:id/status",
	requireApiKey("status:update"),
	updateTicketStatusExternal,
);

// Tasks
router.post("/tasks", requireApiKey("tasks:write"), createTaskExternal);
router.get("/tasks/:id", requireApiKey("tasks:read"), getTaskExternal);
router.patch(
	"/tasks/:id/status",
	requireApiKey("status:update"),
	updateTaskStatusExternal,
);

export default router;
