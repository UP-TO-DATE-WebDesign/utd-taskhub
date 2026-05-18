const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const REMEMBER_UNTIL_KEY = "remember_until";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface StoreAuthOptions {
	remember: boolean;
	rememberUntil?: number;
}

interface AuthTokens {
	access_token: string;
	refresh_token: string;
	expires_at?: number;
}

function getValidRememberUntil(): number | null {
	const value = localStorage.getItem(REMEMBER_UNTIL_KEY);
	if (!value) return null;

	const rememberUntil = Number(value);
	if (!Number.isFinite(rememberUntil) || rememberUntil <= Date.now()) {
		clearStoredAuth();
		return null;
	}

	return rememberUntil;
}

function setTokens(storage: Storage, tokens: AuthTokens) {
	storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
	storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);

	if (tokens.expires_at) {
		storage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(tokens.expires_at));
	}
}

export function clearStoredAuth() {
	for (const storage of [localStorage, sessionStorage]) {
		storage.removeItem(ACCESS_TOKEN_KEY);
		storage.removeItem(REFRESH_TOKEN_KEY);
		storage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
	}
	localStorage.removeItem(REMEMBER_UNTIL_KEY);
}

export function storeAuthTokens(tokens: AuthTokens, options: StoreAuthOptions) {
	clearStoredAuth();

	const expiryMs = options.remember ? THIRTY_DAYS_MS : ONE_DAY_MS;
	const rememberUntil = options.rememberUntil ?? Date.now() + expiryMs;
	localStorage.setItem(REMEMBER_UNTIL_KEY, String(rememberUntil));
	setTokens(localStorage, tokens);
}

export function getStoredAccessToken(): string | null {
	if (localStorage.getItem(REMEMBER_UNTIL_KEY) && !getValidRememberUntil()) {
		return null;
	}

	return (
		sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
		localStorage.getItem(ACCESS_TOKEN_KEY)
	);
}

export function getStoredRefreshToken(): string | null {
	if (localStorage.getItem(REMEMBER_UNTIL_KEY) && !getValidRememberUntil()) {
		return null;
	}

	return (
		sessionStorage.getItem(REFRESH_TOKEN_KEY) ??
		localStorage.getItem(REFRESH_TOKEN_KEY)
	);
}

export function getStoredRememberUntil(): number | null {
	return getValidRememberUntil();
}
