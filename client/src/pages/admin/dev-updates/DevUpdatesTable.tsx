import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DevUpdate } from "@/services/dev-updates.service";

const TYPE_VARIANT: Record<
	string,
	"done" | "high" | "urgent" | "review" | "default"
> = {
	Feature: "done",
	Fix: "urgent",
	Enhancement: "review",
	Perf: "high",
};

function formatDate(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export default function DevUpdatesTable({ updates }: { updates: DevUpdate[] }) {
	return (
		<div className="overflow-x-auto rounded-md border border-border">
			<table className="w-full text-sm">
				<thead className="bg-muted-subtle text-left text-xs uppercase text-muted">
					<tr>
						<th className="px-3 py-2 font-medium">Date</th>
						<th className="px-3 py-2 font-medium">App</th>
						<th className="px-3 py-2 font-medium">Type</th>
						<th className="px-3 py-2 font-medium">Change</th>
						<th className="px-3 py-2 font-medium">Description</th>
						<th className="px-3 py-2 font-medium" />
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{updates.map((u) => (
						<tr key={u.id} className="align-top">
							<td className="whitespace-nowrap px-3 py-2 text-muted">
								{formatDate(u.date)}
							</td>
							<td className="whitespace-nowrap px-3 py-2 text-foreground">
								{u.app}
							</td>
							<td className="px-3 py-2">
								<Badge variant={TYPE_VARIANT[u.type] ?? "default"}>
									{u.type}
								</Badge>
							</td>
							<td className="px-3 py-2 font-medium text-foreground">
								{u.change}
							</td>
							<td className="max-w-md px-3 py-2 text-muted">
								<span className="line-clamp-2">{u.description ?? ""}</span>
							</td>
							<td className="px-3 py-2">
								{u.url && (
									<a
										href={u.url}
										target="_blank"
										rel="noreferrer"
										className="text-muted hover:text-foreground"
									>
										<ExternalLink className="h-4 w-4" />
									</a>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
