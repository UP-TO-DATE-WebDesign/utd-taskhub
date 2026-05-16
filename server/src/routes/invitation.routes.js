import express from "express";
import { acceptInvitation } from "../controllers/invitation.controller.js";
import { sensitiveAuthLimiter } from "../middlewares/rate-limit.middleware.js";

const router = express.Router();

// Public — no auth required. Token is the credential.
// Rate-limited to slow brute force against the token space.
router.post("/accept", sensitiveAuthLimiter, acceptInvitation);

export default router;
