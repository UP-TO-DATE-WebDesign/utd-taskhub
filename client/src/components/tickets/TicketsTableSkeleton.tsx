import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = [
	"Title",
	"Type",
	"Priority",
	"Status",
	"Assigned To",
	"Created",
	"",
];

const ROW_COUNT = 6;

export function TicketsTableSkeleton() {
	return (
		<Card className="p-0 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted-subtle">
							{COLUMNS.map((h, i) => (
								<th
									key={i}
									className={`px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted text-left ${i === 0 ? "pl-5" : ""}`}
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: ROW_COUNT }).map((_, r) => (
							<tr
								key={r}
								className="border-b border-border last:border-0"
							>
								<td className="px-4 pl-5 py-3">
									<Skeleton className="h-4 w-48" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-16 rounded-full" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-16 rounded-full" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-20 rounded-full" />
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-2">
										<Skeleton className="h-6 w-6 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-4 w-20" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-6 w-6 rounded-md" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
