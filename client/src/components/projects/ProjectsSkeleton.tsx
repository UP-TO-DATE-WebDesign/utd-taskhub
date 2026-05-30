import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectCardSkeleton() {
	return (
		<Card className="flex flex-col gap-4 p-5">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="mt-2 h-3 w-full" />
					<Skeleton className="mt-1.5 h-3 w-4/5" />
				</div>
				<Skeleton className="h-5 w-20 shrink-0 rounded-full" />
			</div>

			<div className="flex gap-1.5">
				<Skeleton className="h-4 w-12 rounded-full" />
				<Skeleton className="h-4 w-16 rounded-full" />
			</div>

			<div>
				<div className="mb-1.5 flex justify-between">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-8" />
				</div>
				<Skeleton className="h-1.5 w-full rounded-full" />
			</div>

			<div className="flex items-center justify-between gap-3 border-t border-border pt-3">
				<div className="flex items-center">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton
							key={i}
							className={`h-6 w-6 rounded-full ${i > 0 ? "-ml-2" : ""}`}
						/>
					))}
				</div>
				<Skeleton className="h-3 w-20" />
			</div>
		</Card>
	);
}

function ProjectRowSkeleton() {
	return (
		<div className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Skeleton className="h-7 w-7 shrink-0 rounded-md" />
				<div className="min-w-0 flex-1">
					<Skeleton className="h-3.5 w-32" />
					<Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
				</div>
			</div>
			<Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
			<Skeleton className="hidden h-1.5 w-24 rounded-full md:block" />
			<Skeleton className="hidden h-3 w-10 lg:block" />
			<Skeleton className="h-6 w-16" />
		</div>
	);
}

export default function ProjectsSkeleton({
	view = "grid",
	count = 6,
}: {
	view?: "grid" | "list";
	count?: number;
}) {
	if (view === "list") {
		return (
			<Card className="overflow-hidden p-0">
				{Array.from({ length: count }).map((_, i) => (
					<ProjectRowSkeleton key={i} />
				))}
			</Card>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<ProjectCardSkeleton key={i} />
			))}
		</div>
	);
}
