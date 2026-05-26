import { Progress, Skeleton } from "@mantine/core";
import type { SprintCapacitySummary } from "@/types/capacity";

interface SprintCapacityInlineProps {
	capacity: SprintCapacitySummary | null;
	variant: "card" | "row";
	loading?: boolean;
}

function barColor(assignedPct: number, isOverbooked: boolean) {
	if (assignedPct >= 75) return isOverbooked ? "red" : "orange";
	return "blue";
}

const SprintCapacityInline = ({
	capacity,
	variant,
	loading,
}: SprintCapacityInlineProps) => {
	if (loading) {
		if (variant === "row") {
			return (
				<div className="flex flex-col gap-1 min-w-[140px]">
					<Skeleton height={8} />
					<Skeleton height={10} width="50%" />
				</div>
			);
		}
		return (
			<div className="flex flex-col w-full mt-4 gap-1 items-center justify-center">
				<span className="text-secondary font-light text-[10px]">
					Sprint Capacity
				</span>
				<Skeleton height={12} width="15%" />
				<Skeleton height={12} />
				<Skeleton height={14} width="35%" />
			</div>
		);
	}

	if (!capacity) {
		if (variant === "row") {
			return (
				<span className="text-[10px] text-muted-foreground">
					No active sprint
				</span>
			);
		}
		return (
			<div className="w-full mt-4 text-left">
				<span className="text-secondary font-light text-[10px]">
					Sprint Capacity
				</span>
				<p className="text-[10px] text-muted-foreground mt-0.5">
					No active sprint
				</p>
			</div>
		);
	}

	const assignedPct = Math.min(
		Math.round((capacity.assignedHours / capacity.capacityHours) * 100),
		100,
	);
	const remainingPct = 100 - assignedPct;
	const color = barColor(assignedPct, capacity.isOverbooked);

	if (variant === "row") {
		return (
			<div className="flex flex-col gap-1 min-w-[140px] max-w-[180px]">
				<Progress.Root size="sm">
					<Progress.Section value={assignedPct} color={color} />
					<Progress.Section value={remainingPct} color="#b8bbc1" />
				</Progress.Root>
				<div className="flex items-center justify-between gap-2">
					<span className="text-[10px]">
						<b
							className={
								capacity.isOverbooked
									? "text-danger"
									: "text-primary"
							}
						>
							{capacity.assignedHours}h
						</b>
						<span className="text-muted-foreground">
							{" "}
							/ {capacity.capacityHours}h
						</span>
					</span>
					{capacity.isOverbooked && (
						<span className="text-[9px] text-danger font-medium">
							Overbooked
						</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full mt-0 gap-1">
			<div className="flex items-center gap-1">
				<span className="text-secondary font-medium text-xs">
					Sprint Capacity
				</span>
				<span className="text-muted text-xs">|</span>
				<span className="text-xs text-muted-foreground truncate">
					{capacity.sprintName}
				</span>
				<div className="flex flex-col items-center ml-auto">
					<div className="text-xs">
						<b
							className={
								capacity.isOverbooked
									? "text-danger"
									: "text-primary"
							}
						>
							{capacity.assignedHours}h
						</b>
						<span className="text-muted-foreground">
							{" "}
							/ {capacity.capacityHours}h
						</span>
					</div>
					{capacity.isOverbooked && (
						<span className="text-[9px] text-danger font-medium">
							Overbooked
						</span>
					)}
				</div>
			</div>

			<Progress.Root size="lg">
				<Progress.Section value={assignedPct} color={color} animated>
					<Progress.Label>{assignedPct}%</Progress.Label>
				</Progress.Section>
				<Progress.Section value={remainingPct} color="#b8bbc1">
					<Progress.Label>{remainingPct}%</Progress.Label>
				</Progress.Section>
			</Progress.Root>
		</div>
	);
};

export default SprintCapacityInline;
