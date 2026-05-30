import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import type { Theme } from "@/types/user";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/profile.service";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "system";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "system";
}

function applyTheme(resolved: "light" | "dark") {
	const root = document.documentElement;
	root.classList.toggle("dark", resolved === "dark");
	root.setAttribute("data-mantine-color-scheme", resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
		getStoredTheme() === "system" ? getSystemTheme() : (getStoredTheme() as "light" | "dark"),
	);
	const lastSyncedUserTheme = useRef<Theme | null>(null);

	// Apply theme to <html> whenever preference or OS setting changes.
	useEffect(() => {
		const resolved = theme === "system" ? getSystemTheme() : theme;
		setResolvedTheme(resolved);
		applyTheme(resolved);

		if (theme !== "system") return;
		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			const next = mql.matches ? "dark" : "light";
			setResolvedTheme(next);
			applyTheme(next);
		};
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [theme]);

	// Account preference wins: sync from the logged-in user's saved theme.
	useEffect(() => {
		const userTheme = user?.theme;
		if (!userTheme) return;
		if (lastSyncedUserTheme.current === userTheme) return;
		lastSyncedUserTheme.current = userTheme;
		setThemeState(userTheme);
		window.localStorage.setItem(STORAGE_KEY, userTheme);
	}, [user?.theme]);

	const setTheme = useCallback(
		(next: Theme) => {
			setThemeState(next);
			window.localStorage.setItem(STORAGE_KEY, next);
			lastSyncedUserTheme.current = next;
			if (user?.id) {
				updateProfile(user.id, { theme: next }).catch(() => {
					toast.error("Failed to save theme preference.");
				});
			}
		},
		[user?.id],
	);

	return (
		<ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
