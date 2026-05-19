import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 5;

export function SprintsListSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: ROW_COUNT }).map((_, i) => (
				<Card key={i} className="flex items-center gap-4 px-5 py-4">
					<div className="flex-1 min-w-0 space-y-2">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-3 w-32" />
					</div>
					<Skeleton className="h-5 w-16 rounded-full" />
					<div className="flex items-center gap-2 shrink-0">
						<Skeleton className="h-8 w-24 rounded-md" />
						<Skeleton className="h-8 w-8 rounded-md" />
						<Skeleton className="h-8 w-8 rounded-md" />
					</div>
				</Card>
			))}
		</div>
	);
}
