import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

const EXAMPLES: { title: string; lang: string; code: string }[] = [
	{
		title: "Create a ticket (curl)",
		lang: "bash",
		code: `curl -X POST ${API_BASE}/external/tickets \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Login button broken on Safari",
    "type": "bug",
    "description": "Clicking login does nothing on iOS Safari.",
    "priority": "high"
  }'`,
	},
	{
		title: "Create a task (JavaScript fetch)",
		lang: "javascript",
		code: `await fetch("${API_BASE}/external/tasks", {
  method: "POST",
  headers: {
    Authorization: "Bearer thk_live_YOUR_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Follow up with customer",
    priority: "medium",
    tags: ["support", "vip"],
  }),
});`,
	},
	{
		title: "Read a ticket by id (Python)",
		lang: "python",
		code: `import requests

r = requests.get(
    "${API_BASE}/external/tickets/<TICKET_UUID>",
    headers={"Authorization": "Bearer thk_live_YOUR_KEY"},
)
print(r.json())`,
	},
	{
		title: "Update ticket status",
		lang: "bash",
		code: `curl -X PATCH ${API_BASE}/external/tickets/<TICKET_UUID>/status \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "closed", "resolution": "Fixed in release 2.4" }'`,
	},
];

export function ApiKeyUsageExamples() {
	const [open, setOpen] = useState(true);

	return (
		<div className="rounded-lg border border-border bg-surface">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left"
			>
				<span className="text-sm font-medium text-foreground">
					How to use your API key
				</span>
				{open ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				)}
			</button>
			{open && (
				<div className="space-y-4 border-t border-border px-4 py-4">
					<p className="text-xs text-muted-foreground">
						Send your API key in the <code className="rounded bg-muted-subtle px-1">Authorization</code> header.
						The key is bound to a single project, so you don't need to
						include the project id in the request body.
					</p>
					{EXAMPLES.map((ex) => (
						<div key={ex.title} className="space-y-1">
							<p className="text-xs font-medium text-foreground">
								{ex.title}
							</p>
							<pre
								className={cn(
									"overflow-x-auto rounded-md border border-border bg-muted-subtle p-3 text-[11px] leading-relaxed text-foreground",
								)}
							>
								<code>{ex.code}</code>
							</pre>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
