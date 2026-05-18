export const AVATAR_COLORS = [
	"bg-primary",
	"bg-accent",
	"bg-secondary",
	"bg-warning",
	"bg-danger",
];

export function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function avatarColor(index: number): string {
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
