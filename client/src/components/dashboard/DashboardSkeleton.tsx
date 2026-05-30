import { Card } from "@/components/ui/card";
import SkeletonLoader from "@/components/ui/skeleton-loader";

export default function DashboardSkeleton() {
	return (
		<div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
			{/* Page header */}
			<div className="mb-8">
				<SkeletonLoader className="h-8 w-64" />
				<SkeletonLoader className="mt-2 h-4 w-80 max-w-full" />
			</div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i} className="p-4">
						<SkeletonLoader className="mb-3 h-3 w-16" />
						<div className="flex items-center justify-between">
							<SkeletonLoader className="h-8 w-10" />
							<SkeletonLoader className="h-6 w-6 rounded-full" />
						</div>
					</Card>
				))}
			</div>

			{/* Main content */}
			<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
				{/* LEFT */}
				<div className="flex flex-col gap-6">
					{/* Active Sprint */}
					<Card className="p-5">
						<div className="mb-5 flex items-center justify-between">
							<div>
								<SkeletonLoader className="h-5 w-28" />
								<SkeletonLoader className="mt-2 h-3 w-36" />
							</div>
							<SkeletonLoader className="h-5 w-14 rounded-full" />
						</div>
						<div className="space-y-5">
							<SkeletonLoader className="h-5 w-40" />
							<SkeletonLoader className="h-2 w-full rounded-full" />
							<div className="grid grid-cols-2 gap-3">
								<SkeletonLoader className="h-16 w-full" />
								<SkeletonLoader className="h-16 w-full" />
							</div>
						</div>
					</Card>

					{/* Tickets */}
					<Card className="p-5">
						<SkeletonLoader className="mb-4 h-5 w-20" />
						<div className="space-y-4">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="flex items-start gap-3">
									<SkeletonLoader className="h-9 w-9 rounded-full shrink-0" />
									<div className="flex-1">
										<SkeletonLoader className="h-4 w-3/4" />
										<SkeletonLoader className="mt-1.5 h-3 w-1/2" />
									</div>
								</div>
							))}
						</div>
						<SkeletonLoader className="mt-5 h-9 w-full" />
					</Card>
				</div>

				{/* RIGHT */}
				<div className="flex flex-col gap-6">
					{/* Recent Tasks */}
					<Card className="p-0 overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-border">
							<SkeletonLoader className="h-5 w-28" />
							<SkeletonLoader className="h-4 w-16" />
						</div>
						<div className="divide-y divide-border">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="flex items-center gap-3 px-5 py-4"
								>
									<SkeletonLoader className="h-2 w-2 rounded-full shrink-0" />
									<SkeletonLoader className="h-4 flex-1" />
									<SkeletonLoader className="hidden h-4 w-24 sm:block" />
									<SkeletonLoader className="hidden h-4 w-16 sm:block" />
									<SkeletonLoader className="h-5 w-20 rounded-full" />
								</div>
							))}
						</div>
					</Card>

					{/* Tasks by Status */}
					<Card className="p-5">
						<SkeletonLoader className="mb-5 h-5 w-32" />
						<div className="space-y-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i}>
									<div className="mb-1.5 flex items-center justify-between">
										<SkeletonLoader className="h-4 w-24" />
										<SkeletonLoader className="h-4 w-6" />
									</div>
									<SkeletonLoader className="h-1.5 w-full rounded-full" />
								</div>
							))}
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
