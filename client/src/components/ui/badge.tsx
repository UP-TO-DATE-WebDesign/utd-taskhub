import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
	{
		variants: {
			variant: {
				/* priority */
				urgent: "bg-danger-subtle text-danger border border-danger/20",
				high: "bg-warning-subtle text-warning border border-warning/20",
				medium: "bg-primary-subtle text-primary border border-primary/20",
				low: "bg-muted-subtle text-muted border border-border",

				/* workflow */
				backlog: "bg-muted-subtle text-muted border border-border",
				todo: "bg-muted-subtle text-muted-foreground border border-border",
				"in-progress": "bg-primary text-primary-foreground",
				review: "bg-secondary-subtle text-secondary border border-secondary/20",
				done: "bg-secondary text-secondary-foreground",
				cancelled: "bg-border text-muted",

				/* general */
				open: "bg-secondary-subtle text-secondary border border-secondary/20",
				primary: "bg-blue-800 text-white border border-blue-800/20",
				accent: "bg-accent-subtle text-accent border border-accent/20",
				default: "bg-muted-subtle text-muted-foreground",
				outline: "bg-muted-subtle text-muted-foreground",
				important:
					"bg-indigo-600 text-white border border-indigo-600/20",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends
		React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
