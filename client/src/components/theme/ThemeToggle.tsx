import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { Theme } from "@/types/user";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({
	className,
	showLabels = false,
}: {
	className?: string;
	showLabels?: boolean;
}) {
	const { theme, setTheme } = useTheme();

	return (
		<div
			role="radiogroup"
			aria-label="Theme"
			className={cn(
				"inline-flex items-center gap-1 rounded-sm border border-border bg-muted-subtle p-0.5",
				className,
			)}
		>
			{OPTIONS.map(({ value, label, icon: Icon }) => {
				const active = theme === value;
				return (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={label}
						onClick={() => setTheme(value)}
						className={cn(
							"flex items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
							showLabels ? "flex-1" : "",
							active
								? "bg-surface text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-4 w-4 shrink-0" />
						{showLabels && <span>{label}</span>}
					</button>
				);
			})}
		</div>
	);
}
