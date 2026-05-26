import dotenv from "dotenv";

dotenv.config();

export const env = {
	nodeEnv: process.env.NODE_ENV || "development",
	port: process.env.PORT || 5050,
	appName: process.env.APP_NAME || "TaskHub API",
	apiVersion: process.env.API_VERSION || "v1",

	appUrl: process.env.APP_URL || "http://localhost:5173",
	apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 5050}`,

	cookieSecret: process.env.COOKIE_SECRET || "dev-only-cookie-secret-change-me",

	supabaseUrl: process.env.SUPABASE_URL,
	supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
	supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
	supabaseAvatarBucket: process.env.SUPABASE_AVATAR_BUCKET || "avatars",
	supabaseTaskAttachmentsBucket:
		process.env.SUPABASE_TASK_ATTACHMENTS_BUCKET || "task-attachments",
	supabaseTicketAttachmentsBucket:
		process.env.SUPABASE_TICKET_ATTACHMENTS_BUCKET || "ticket-attachments",

	GMAIL_USER: process.env.GMAIL_USER,
	GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
	MAIL_SENDER_NAME: process.env.MAIL_SENDER_NAME,

	sentryDsn: process.env.SENTRY_DSN,
	sentryTracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
	sentryProfilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE,
};
