import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COUNT = 6;
const COLUMNS = ["User", "Role", "Status", "Joined", ""];

function UserCardSkeleton() {
	return (
		<Card className="p-5">
			<div className="flex items-center gap-3">
				<Skeleton className="h-4 w-20 rounded-full" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-30 ml-auto" />
			</div>
			<div className="flex items-center gap-3 mt-2">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-40" />
				</div>
			</div>
		</Card>
	);
}

function UsersTableSkeleton() {
	return (
		<Card className="p-0 overflow-hidden">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border">
						{COLUMNS.map((h, i) => (
							<th
								key={h + i}
								className={`px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left ${i === 0 ? "pl-5" : ""}`}
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{Array.from({ length: COUNT }).map((_, r) => (
						<tr
							key={r}
							className="border-b border-border last:border-0"
						>
							<td className="px-4 pl-5 py-3">
								<div className="flex items-center gap-3">
									<Skeleton className="h-8 w-8 rounded-full" />
									<div className="space-y-1.5">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-40" />
									</div>
								</div>
							</td>
							<td className="px-4 py-3">
								<Skeleton className="h-5 w-20 rounded-full" />
							</td>
							<td className="px-4 py-3">
								<Skeleton className="h-5 w-16 rounded-full" />
							</td>
							<td className="px-4 py-3">
								<Skeleton className="h-4 w-24" />
							</td>
							<td className="px-4 py-3">
								<Skeleton className="h-6 w-6 rounded-md" />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	);
}

export function UsersPageSkeleton({ view }: { view: "grid" | "list" }) {
	if (view === "list") return <UsersTableSkeleton />;
	return (
		<div className="grid grid-cols-3 gap-4">
			{Array.from({ length: COUNT }).map((_, i) => (
				<UserCardSkeleton key={i} />
			))}
		</div>
	);
}
