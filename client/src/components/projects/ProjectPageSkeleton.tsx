import { Skeleton } from "@/components/ui/skeleton";

const TAB_COUNT = 5;

function OverviewCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-white p-5">
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
		<div className="mx-auto max-w-[1280px] px-6 py-8">
			{/* Back link */}
			<Skeleton className="h-4 w-20 mb-6" />

			{/* Header */}
			<div className="flex items-start justify-between gap-6 mb-6">
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-3 mb-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-2/4" />
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Skeleton className="h-9 w-32 rounded-md" />
					<Skeleton className="h-9 w-32 rounded-md" />
				</div>
			</div>

			{/* Tabs */}
			<div className="flex flex-wrap items-center gap-6 border-b border-border mb-8 pb-2">
				{Array.from({ length: TAB_COUNT }).map((_, i) => (
					<Skeleton key={i} className="h-5 w-20" />
				))}
			</div>

			{/* Overview grid */}
			<div className="grid gap-6 md:grid-cols-2">
				<OverviewCardSkeleton />
				<OverviewCardSkeleton />
			</div>
		</div>
	);
}
