import { useEffect, useState } from "react";
import { Progress, Skeleton } from "@mantine/core";
import { getUserSprintCapacity } from "@/services/capacity.service";
import type { SprintCapacitySummary } from "@/types/capacity";

interface SprintCapacityProps {
	userId?: string;
}

const SprintCapacity = ({ userId }: SprintCapacityProps) => {
	const [data, setData] = useState<SprintCapacitySummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!userId) return;

		setLoading(true);
		setError(null);

		getUserSprintCapacity(userId)
			.then(setData)
			.catch(() => setError("Failed to load."))
			.finally(() => setLoading(false));
	}, [userId]);

	if (!userId) return null;

	if (loading) {
		return (
			<div className="flex flex-col w-full mt-4 gap-1 items-center justify-center">
				<span className="text-secondary font-light text-[10px] text-center">
					Sprint Capacity
				</span>
				<Skeleton height={12} width={"15%"} />
				<Skeleton height={12} />
				<Skeleton height={14} width={"35%"} />
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full mt-4 text-center">
				<span className="text-[10px] text-danger">{error}</span>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="w-full mt-4 text-center">
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
		Math.round((data.assignedHours / data.capacityHours) * 100),
		100,
	);
	const remainingPct = 100 - assignedPct;
	const barColor =
		assignedPct >= 75 ? (data.isOverbooked ? "red" : "orange") : "blue";

	return (
		<div className="flex flex-col w-full mt-4 gap-1">
			<span className="text-secondary font-light text-[10px] text-center">
				Sprint Capacity
			</span>
			<span className="text-[9px] text-muted-foreground text-center truncate">
				{data.sprintName}
			</span>

			<Progress.Root size="lg">
				<Progress.Section value={assignedPct} color={barColor} animated>
					<Progress.Label>{assignedPct}%</Progress.Label>
				</Progress.Section>
				<Progress.Section value={remainingPct} color="#b8bbc1">
					<Progress.Label>{remainingPct}%</Progress.Label>
				</Progress.Section>
			</Progress.Root>

			<div className="flex flex-col items-center">
				<div className="text-xs">
					<b
						className={
							data.isOverbooked ? "text-danger" : "text-primary"
						}
					>
						{data.assignedHours}h
					</b>
					<span className="text-muted-foreground">
						{" "}
						/ {data.capacityHours}h
					</span>
				</div>
				{data.isOverbooked && (
					<span className="text-[9px] text-danger font-medium">
						Overbooked
					</span>
				)}
			</div>
		</div>
	);
};

export default SprintCapacity;
