import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import projectRoutes from "./routes/project.routes.js";
import authRoutes from "./routes/auth.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import boardRoutes from "./routes/board.routes.js";
import boardColumnRoutes from "./routes/board-column.routes.js";
import taskRoutes from "./routes/task.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import projectMemberRoutes from "./routes/project-member.routes.js";
import userRoutes from "./routes/user.routes.js";
import roleRoutes from "./routes/role.routes.js";
import sprintRoutes from "./routes/sprint.routes.js";
import systemLogRoutes from "./routes/system-log.routes.js";
import workspaceSettingsRoutes from "./routes/workspace-settings.routes.js";
import taskTypeRoutes from "./routes/task-type.routes.js";
import workflowStageRoutes from "./routes/workflow-stage.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import adminReportRoutes from "./routes/admin-report.routes.js";
import adminReportRealRoutes from "./routes/admin-report-real.routes.js";
import sprintReportRoutes from "./routes/sprint-report.routes.js";
import trashRoutes from "./routes/trash.routes.js";
import apiKeyRoutes from "./routes/api-key.routes.js";
import externalRoutes from "./routes/external.routes.js";
import { externalApiLimiter } from "./middlewares/rate-limit.middleware.js";
import {
	notFoundHandler,
	errorHandler,
} from "./middlewares/error.middleware.js";
import { getAllTasks } from "./controllers/task.controller.js";
import { getDashboard } from "./controllers/dashboard.controller.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import { bindSupabaseContext } from "./config/supabase.js";
import { Sentry } from "./config/sentry.js";

const app = express();

// Trust first proxy hop so req.ip reflects the real client IP behind a
// load balancer / reverse proxy. Required for rate-limit keying.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
	cors({
		origin(origin, callback) {
			// Allow requests with no origin (curl, Postman, server-to-server)
			if (!origin) return callback(null, true);

			const allowed =
				env.nodeEnv === "development"
					? /^http:\/\/localhost(:\d+)?$/.test(origin)
					: origin === env.appUrl;

			callback(
				allowed ? null : new Error("Not allowed by CORS"),
				allowed,
			);
		},
		credentials: true,
	}),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser(env.cookieSecret));
app.use(bindSupabaseContext);

if (env.nodeEnv === "development") {
	app.use(
		morgan("dev", {
			skip: (req) =>
				req.originalUrl.startsWith(
					`/api/${env.apiVersion}/notifications/stream`,
				),
		}),
	);
}

app.get("/", (req, res) => {
	res.json({
		success: true,
		message: `${env.appName} is running`,
		version: env.apiVersion,
	});
});

app.use(`/api/${env.apiVersion}/health`, healthRoutes);
app.use(`/api/${env.apiVersion}/auth`, authRoutes);
app.use(`/api/${env.apiVersion}/projects`, projectRoutes);
app.use(`/api/${env.apiVersion}/invitations`, invitationRoutes);
app.use(`/api/${env.apiVersion}/profiles`, profileRoutes);
app.use(`/api/${env.apiVersion}/projects/:projectId/boards`, boardRoutes);
app.use(
	`/api/${env.apiVersion}/projects/:projectId/boards/:boardId/columns`,
	boardColumnRoutes,
);
app.use(`/api/${env.apiVersion}/projects/:projectId/tasks`, taskRoutes);
app.use(`/api/${env.apiVersion}/projects/:projectId/tickets`, ticketRoutes);
app.use(
	`/api/${env.apiVersion}/projects/:projectId/members`,
	projectMemberRoutes,
);
app.use(`/api/${env.apiVersion}/sprints`, sprintRoutes);
app.use(`/api/${env.apiVersion}/users`, userRoutes);
app.use(`/api/${env.apiVersion}/roles`, roleRoutes);
app.use(`/api/${env.apiVersion}/system-logs`, systemLogRoutes);
app.use(`/api/${env.apiVersion}/workspace-settings`, workspaceSettingsRoutes);
app.use(`/api/${env.apiVersion}/task-types`, taskTypeRoutes);
app.use(
	`/api/${env.apiVersion}/projects/:projectId/workflow-stages`,
	workflowStageRoutes,
);
app.use(`/api/${env.apiVersion}/notifications`, notificationRoutes);
app.use(`/api/${env.apiVersion}/admin`, adminReportRealRoutes);
app.use(`/api/${env.apiVersion}/admin`, adminReportRoutes);
app.use(`/api/${env.apiVersion}/admin`, sprintReportRoutes);
app.use(`/api/${env.apiVersion}/trash`, trashRoutes);
app.use(`/api/${env.apiVersion}/api-keys`, apiKeyRoutes);
app.use(`/api/${env.apiVersion}/external`, externalApiLimiter, externalRoutes);

app.get(`/api/${env.apiVersion}/tasks`, requireAuth, getAllTasks);
app.get(`/api/${env.apiVersion}/dashboard`, requireAuth, getDashboard);

Sentry.setupExpressErrorHandler(app);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
