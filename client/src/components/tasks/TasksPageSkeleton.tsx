import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_CARD_COUNTS = [3, 2, 2, 1, 2];

function TaskCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-white p-3 flex flex-col gap-2.5 shadow-sm">
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-14 rounded-full" />
				<Skeleton className="h-3 w-3 rounded-full" />
			</div>
			<Skeleton className="h-4 w-4/5" />
			<Skeleton className="h-3 w-2/5" />
			<div className="flex items-center justify-between pt-1">
				<Skeleton className="h-6 w-6 rounded-full" />
				<Skeleton className="h-3 w-12" />
			</div>
		</div>
	);
}

function BoardColumnSkeleton({ count }: { count: number }) {
	return (
		<div className="flex flex-col min-w-[280px] flex-1">
			<div className="flex items-center gap-2 mb-3 px-1">
				<Skeleton className="h-2 w-2 rounded-full" />
				<Skeleton className="h-4 w-20" />
				<Skeleton className="ml-auto h-4 w-6 rounded-full" />
			</div>
			<div className="flex-1 flex flex-col gap-2.5 rounded-xl p-2 min-h-[200px] bg-muted-subtle/40">
				{Array.from({ length: count }).map((_, i) => (
					<TaskCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

export function TasksPageSkeleton() {
	return (
		<div className="mx-auto max-w-[1280px] px-6 py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-32 rounded-md" />
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2 mb-6">
				<Skeleton className="h-9 w-64 rounded-md" />
				<Skeleton className="h-9 w-32 rounded-md" />
				<Skeleton className="h-9 w-32 rounded-md" />
				<Skeleton className="h-9 w-32 rounded-md" />
				<Skeleton className="h-9 w-32 rounded-md" />
				<Skeleton className="ml-auto h-9 w-20 rounded-md" />
			</div>

			{/* Board columns */}
			<div className="flex gap-4 overflow-x-auto pb-4 items-start">
				{COLUMN_CARD_COUNTS.map((count, i) => (
					<BoardColumnSkeleton key={i} count={count} />
				))}
			</div>
		</div>
	);
}
