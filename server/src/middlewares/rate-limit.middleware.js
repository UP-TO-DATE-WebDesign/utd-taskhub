import rateLimit from "express-rate-limit";

// Shared limiter for sensitive credential / token endpoints.
// 5 attempts per 15 minutes per IP. Tighter than the default to slow
// brute force against invitation tokens and login/register endpoints.
//
// NOTE: standardHeaders=true emits RFC draft RateLimit-* headers so the
// frontend can show "try again in X seconds" when needed.
export const sensitiveAuthLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many attempts. Please try again later.",
	},
});

// Limiter for external API endpoints (key-auth). Per-key when the API
// key middleware has run, otherwise fall back to per-IP for failed auth.
export const externalApiLimiter = rateLimit({
	windowMs: 60 * 1000,
	limit: 60,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	keyGenerator: (req) => req.apiKey?.id || req.ip,
	message: {
		success: false,
		message: "Rate limit exceeded. Try again shortly.",
	},
});
