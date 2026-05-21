import { supabase, supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import {
	generatePKCEPair,
	buildGoogleAuthorizeUrl,
	exchangePKCEForSession,
} from "../utils/oauth.js";
import {
	validateRegister,
	validateLogin,
	validateRefreshSession,
} from "../utils/auth.validator.js";
import {
	sendPasswordResetEmail,
	consumeResetToken,
	markResetTokenUsed,
} from "../services/password-reset.service.js";

const PKCE_COOKIE_NAME = "sb_pkce";
const PKCE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function clientRedirect(res, params) {
	const query = new URLSearchParams(params).toString();
	return res.redirect(`${env.appUrl}/auth/callback?${query}`);
}

function clientRedirectWithSession(res, session) {
	const hash = new URLSearchParams({
		access_token: session.access_token,
		refresh_token: session.refresh_token,
		expires_at: String(session.expires_at ?? ""),
	}).toString();
	return res.redirect(`${env.appUrl}/auth/callback#${hash}`);
}

function pkceCookieOptions() {
	return {
		httpOnly: true,
		signed: true,
		secure: env.nodeEnv !== "development",
		sameSite: "lax",
		path: "/",
		maxAge: PKCE_COOKIE_MAX_AGE_MS,
	};
}

export async function register(req, res, next) {
	try {
		const errors = validateRegister(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { email, password, full_name, role } = req.body;

		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email: email.trim().toLowerCase(),
				password,
				email_confirm: true,
				user_metadata: {
					full_name: full_name?.trim() || null,
					role: role,
				},
			});
		if (authError) {
			if (
				authError.message.toLowerCase().includes("already registered")
			) {
				return res.status(409).json({
					success: false,
					message: "An account with this email already exists.",
				});
			} else {
				return res.status(500).json({
					success: false,
					message: authError.message,
				});
			}
		}

		// Trigger has already inserted the profile row; update full_name and role
		const { data: profile, error: profileError } = await supabaseAdmin
			.from("profiles")
			.update({ full_name: full_name?.trim() || null, role: role })
			.eq("id", authData.user.id)
			.select()
			.maybeSingle();

		if (profileError) {
			await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
			throw profileError;
		}

		res.status(201).json({
			success: true,
			message: "Account created successfully.",
			data: {
				user: profile,
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function login(req, res, next) {
	try {
		const errors = validateLogin(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { email, password } = req.body;

		const { data, error } = await supabase.auth.signInWithPassword({
			email: email.trim().toLowerCase(),
			password,
		});

		if (error) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password.",
			});
		}

		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", data.user.id)
			.maybeSingle();

		if (profileError) throw profileError;

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "User profile not found.",
			});
		}

		if (profile.status === "disabled") {
			return res.status(403).json({
				success: false,
				message: "Your account has been disabled.",
			});
		}

		res.status(200).json({
			success: true,
			message: "Logged in successfully.",
			data: {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_at: data.session.expires_at,
				user: profile,
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function refreshSession(req, res, next) {
	try {
		const errors = validateRefreshSession(req.body);

		if (errors.length > 0) {
			return res.status(400).json({
				success: false,
				message: "Validation failed.",
				errors,
			});
		}

		const { refresh_token } = req.body;

		const { data, error } = await supabase.auth.refreshSession({
			refresh_token,
		});

		if (error || !data.session || !data.user) {
			return res.status(401).json({
				success: false,
				message: "Session expired.",
			});
		}

		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", data.user.id)
			.maybeSingle();

		if (profileError) throw profileError;

		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "User profile not found.",
			});
		}

		if (profile.status === "disabled") {
			return res.status(403).json({
				success: false,
				message: "Your account has been disabled.",
			});
		}

		res.status(200).json({
			success: true,
			message: "Session refreshed successfully.",
			data: {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_at: data.session.expires_at,
				user: profile,
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function logout(req, res, next) {
	try {
		const { error } = await supabaseAdmin.auth.admin.signOut(req.token);

		if (error) throw error;

		res.status(200).json({
			success: true,
			message: "Logged out successfully.",
		});
	} catch (error) {
		next(error);
	}
}

export async function me(req, res, next) {
	try {
		res.status(200).json({
			success: true,
			data: {
				user: req.profile,
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function forgotPassword(req, res, next) {
	try {
		const { email } = req.body;
		if (!email || typeof email !== "string") {
			return res.status(400).json({
				success: false,
				message: "Email is required.",
			});
		}

		// Fire-and-forget. Do not leak existence; do not block on send failures.
		sendPasswordResetEmail(email).catch((err) =>
			console.error("[forgot-password] send failed", err),
		);

		return res.status(200).json({
			success: true,
			message:
				"If an account exists for this email, a reset link has been sent.",
		});
	} catch (error) {
		next(error);
	}
}

export async function resetPassword(req, res, next) {
	try {
		const { token, password } = req.body;

		if (!token || typeof token !== "string") {
			return res.status(400).json({
				success: false,
				message: "Reset token is required.",
			});
		}

		const strong =
			typeof password === "string" &&
			password.length >= 8 &&
			/[A-Z]/.test(password) &&
			/[0-9]/.test(password);
		if (!strong) {
			return res.status(400).json({
				success: false,
				message:
					"Password must be 8+ characters with an uppercase letter and a number.",
			});
		}

		const result = await consumeResetToken(token);
		if (!result.ok) {
			const message =
				result.reason === "expired"
					? "This reset link has expired. Request a new one."
					: "Invalid or already-used reset link.";
			return res.status(400).json({ success: false, message });
		}

		const { error: updateError } =
			await supabaseAdmin.auth.admin.updateUserById(result.row.user_id, {
				password,
			});
		if (updateError) throw updateError;

		await markResetTokenUsed(result.row.id);

		return res.status(200).json({
			success: true,
			message: "Password updated.",
			data: { email: result.row.email },
		});
	} catch (error) {
		next(error);
	}
}

export async function completeInvite(req, res, next) {
	try {
		const { full_name, password, role } = req.body;

		if (!password || password.length < 8) {
			return res.status(400).json({
				success: false,
				message: "Password must be at least 8 characters.",
			});
		}

		const { error: updateError } =
			await supabaseAdmin.auth.admin.updateUserById(req.profile.id, {
				password,
			});
		if (updateError) throw updateError;

		const profileUpdate = {};
		if (full_name?.trim()) profileUpdate.full_name = full_name.trim();
		if (role) profileUpdate.role = role;

		if (Object.keys(profileUpdate).length > 0) {
			await supabaseAdmin
				.from("profiles")
				.update(profileUpdate)
				.eq("id", req.profile.id);
		}

		res.status(200).json({
			success: true,
			message: "Account setup complete.",
		});
	} catch (error) {
		next(error);
	}
}

// Server-initiated Google sign-in (PKCE).
// 1. startGoogleSignIn: generates PKCE verifier + challenge, stores the
//    verifier in a signed HTTP-only cookie, redirects the browser to Supabase
//    /auth/v1/authorize (which forwards to Google).
// 2. googleSignInCallback: Supabase redirects back with `?code=...`. We exchange
//    the code via /auth/v1/token?grant_type=pkce, validate the profile, then
//    redirect to the client with tokens in the URL fragment.
export async function startGoogleSignIn(req, res, next) {
	try {
		const { verifier, challenge } = generatePKCEPair();
		const redirectTo = `${env.apiUrl}/api/${env.apiVersion}/auth/google/callback`;
		const url = buildGoogleAuthorizeUrl({
			redirectTo,
			codeChallenge: challenge,
		});

		res.cookie(PKCE_COOKIE_NAME, verifier, pkceCookieOptions());
		return res.redirect(url);
	} catch (error) {
		next(error);
	}
}

export async function googleSignInCallback(req, res, next) {
	try {
		const {
			code,
			error: providerError,
			error_description: providerErrorDescription,
			error_code: providerErrorCode,
		} = req.query;
		const verifier = req.signedCookies?.[PKCE_COOKIE_NAME];

		const clearCookie = () =>
			res.clearCookie(PKCE_COOKIE_NAME, { path: "/" });

		if (providerError) {
			console.error("[google-oauth] provider returned error", {
				providerError,
				providerErrorCode,
				providerErrorDescription,
			});
			clearCookie();
			return clientRedirect(res, { error: "oauth_failed" });
		}

		if (!code) {
			console.error("[google-oauth] missing code in callback query");
			clearCookie();
			return clientRedirect(res, { error: "oauth_failed" });
		}

		if (!verifier) {
			console.error(
				"[google-oauth] missing PKCE verifier cookie on callback",
			);
			clearCookie();
			return clientRedirect(res, { error: "oauth_failed" });
		}

		const { data, error } = await exchangePKCEForSession({
			code,
			verifier,
		});

		if (
			error ||
			!data?.access_token ||
			!data?.refresh_token ||
			!data?.user
		) {
			console.error("[google-oauth] token exchange failed", {
				error,
				hasAccessToken: !!data?.access_token,
				hasRefreshToken: !!data?.refresh_token,
				hasUser: !!data?.user,
			});
			clearCookie();
			return clientRedirect(res, { error: "oauth_failed" });
		}

		const { data: profile, error: profileError } = await supabaseAdmin
			.from("profiles")
			.select("id, status")
			.eq("id", data.user.id)
			.maybeSingle();

		if (profileError) {
			clearCookie();
			throw profileError;
		}

		if (!profile) {
			clearCookie();
			return clientRedirect(res, { error: "profile_missing" });
		}

		if (profile.status === "disabled") {
			clearCookie();
			return clientRedirect(res, { error: "account_disabled" });
		}

		clearCookie();
		return clientRedirectWithSession(res, {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_at: data.expires_at,
		});
	} catch (error) {
		next(error);
	}
}
