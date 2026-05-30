import { Monitor, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { Theme } from "@/types/user";

const OPTIONS: {
	value: Theme;
	label: string;
	description: string;
	icon: typeof Sun;
}[] = [
	{
		value: "light",
		label: "Light",
		description: "Bright theme for well-lit spaces",
		icon: Sun,
	},
	{
		value: "dark",
		label: "Dark",
		description: "Dimmed theme that is easy on the eyes",
		icon: Moon,
	},
	{
		value: "system",
		label: "System",
		description: "Follow your device appearance setting",
		icon: Monitor,
	},
];

export function ProfileAppearanceSection() {
	const { theme, resolvedTheme, setTheme } = useTheme();

	return (
		<Card className="p-4 sm:p-6">
			<div className="mb-5">
				<h2 className="text-base font-semibold text-foreground">Appearance</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Choose how TaskHub looks. Currently showing the{" "}
					<span className="font-medium capitalize">{resolvedTheme}</span> theme.
				</p>
			</div>

			<div
				role="radiogroup"
				aria-label="Theme"
				className="grid gap-3 sm:grid-cols-3"
			>
				{OPTIONS.map(({ value, label, description, icon: Icon }) => {
					const active = theme === value;
					return (
						<button
							key={value}
							type="button"
							role="radio"
							aria-checked={active}
							onClick={() => setTheme(value)}
							className={cn(
								"flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
								active
									? "border-primary bg-primary-subtle"
									: "border-border hover:border-border-strong hover:bg-muted-subtle",
							)}
						>
							<span
								className={cn(
									"flex h-9 w-9 items-center justify-center rounded-md",
									active
										? "bg-primary text-primary-foreground"
										: "bg-muted-subtle text-muted-foreground",
								)}
							>
								<Icon className="h-5 w-5" />
							</span>
							<span className="text-sm font-medium text-foreground">
								{label}
							</span>
							<span className="text-xs text-muted-foreground">
								{description}
							</span>
						</button>
					);
				})}
			</div>
		</Card>
	);
}
