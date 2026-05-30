import { Skeleton } from "@/components/ui/skeleton";

const TAB_COUNT = 5;

function OverviewCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-surface p-5">
			<Skeleton className="h-5 w-32 mb-4" />
			<div className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-2 w-full rounded-full" />
				<div className="flex items-center gap-2 pt-2">
					<Skeleton className="h-6 w-6 rounded-full" />
					<Skeleton className="h-6 w-6 rounded-full" />
					<Skeleton className="h-6 w-6 rounded-full" />
					<Skeleton className="h-4 w-16 ml-2" />
				</div>
			</div>
		</div>
	);
}

export function ProjectPageSkeleton() {
	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Back */}
			<Skeleton className="mb-6 h-4 w-20" />

			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
				<div className="min-w-0 flex-1">
					<div className="mb-2 flex flex-wrap items-center gap-3">
						<Skeleton className="h-8 w-56" />
						<Skeleton className="h-5 w-20 rounded-full" />
					</div>
					<Skeleton className="h-4 w-full max-w-2xl" />
					<Skeleton className="mt-1.5 h-4 w-3/4 max-w-xl" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-9 w-28" />
				</div>
			</div>

			{/* Tabs */}
			<div className="mb-8 flex gap-6 border-b border-border">
				{Array.from({ length: TAB_COUNT }).map((_, i) => (
					<Skeleton key={i} className="mb-2 h-5 w-20" />
				))}
			</div>

			{/* Overview content */}
			<div className="grid gap-5 lg:grid-cols-3">
				<div className="space-y-5 lg:col-span-2">
					<OverviewCardSkeleton />
					<OverviewCardSkeleton />
				</div>
				<div className="space-y-5">
					<OverviewCardSkeleton />
					<OverviewCardSkeleton />
				</div>
			</div>
		</div>
	);
}
