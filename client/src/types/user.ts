export interface GlobalRole {
	id: string;
	key: string;
	name: string;
	scope: string;
}

export type Theme = "light" | "dark" | "system";

export interface User {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	role: string;
	global_role?: GlobalRole;
	status: string;
	theme?: Theme;
	created_at: string;
}
