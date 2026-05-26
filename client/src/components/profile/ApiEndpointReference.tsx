import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

type Endpoint = {
	method: "POST" | "GET" | "PATCH";
	path: string;
	scope: string;
	summary: string;
	body?: string;
	example: string;
	response: string;
};

const ENDPOINTS: Endpoint[] = [
	{
		method: "POST",
		path: "/external/tickets",
		scope: "tickets:write",
		summary: "Create a ticket in the key's project.",
		body: `{
  "title": "string (required, >=2 chars)",
  "type": "bug | feature_request | issue | support | other",
  "description": "string (optional)",
  "status": "open | in_review | resolved | closed | cancelled",
  "priority": "low | medium | high | urgent",
  "assigned_to": "uuid (optional, must be project member)",
  "due_date": "ISO date (optional)",
  "ticket_code": "uppercase code (optional, auto if blank)"
}`,
		example: `curl -X POST ${API_BASE}/external/tickets \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Login button broken",
    "type": "bug",
    "priority": "high"
  }'`,
		response: `201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticket_code": "WEB-0042",
    "title": "Login button broken",
    "type": "bug",
    "status": "open",
    "priority": "high",
    "source": "external_api",
    "created_by": { "id": "...", "full_name": "...", "email": "..." },
    "created_at": "2026-05-26T08:12:33.000Z"
  }
}`,
	},
	{
		method: "GET",
		path: "/external/tickets/:id",
		scope: "tickets:read",
		summary: "Fetch a ticket by id (must belong to key's project).",
		example: `curl ${API_BASE}/external/tickets/<TICKET_UUID> \\
  -H "Authorization: Bearer thk_live_YOUR_KEY"`,
		response: `200 OK
{ "success": true, "data": { /* ticket */ } }

404 Not Found
{ "success": false, "message": "Ticket not found." }`,
	},
	{
		method: "PATCH",
		path: "/external/tickets/:id/status",
		scope: "status:update",
		summary: "Change ticket status. Set resolution on close.",
		body: `{
  "status": "open | in_review | resolved | closed | cancelled",
  "resolution": "string (optional, only used when closing)"
}`,
		example: `curl -X PATCH ${API_BASE}/external/tickets/<TICKET_UUID>/status \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "closed", "resolution": "Fixed in v2.4" }'`,
		response: `200 OK
{ "success": true, "data": { /* updated ticket */ } }`,
	},
	{
		method: "POST",
		path: "/external/tasks",
		scope: "tasks:write",
		summary: "Create a task in the key's project.",
		body: `{
  "title": "string (required)",
  "description": "string (optional)",
  "status": "workflow stage key (lowercase, optional)",
  "priority": "low | medium | high | urgent",
  "assigned_to": "uuid (optional, must be project member)",
  "board_column_id": "uuid (optional)",
  "due_date": "ISO date (optional)",
  "tags": ["array of strings (optional)"],
  "task_type_id": "uuid (optional, default applied if blank)"
}`,
		example: `curl -X POST ${API_BASE}/external/tasks \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Follow up with customer",
    "priority": "medium",
    "tags": ["support", "vip"]
  }'`,
		response: `201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Follow up with customer",
    "status": "backlog",
    "priority": "medium",
    "tags": ["support", "vip"],
    "source": "external_api",
    "created_at": "2026-05-26T08:12:33.000Z"
  }
}`,
	},
	{
		method: "GET",
		path: "/external/tasks/:id",
		scope: "tasks:read",
		summary: "Fetch a task by id (must belong to key's project).",
		example: `curl ${API_BASE}/external/tasks/<TASK_UUID> \\
  -H "Authorization: Bearer thk_live_YOUR_KEY"`,
		response: `200 OK
{ "success": true, "data": { /* task */ } }`,
	},
	{
		method: "PATCH",
		path: "/external/tasks/:id/status",
		scope: "status:update",
		summary: "Change task status. Must be a valid workflow stage key.",
		body: `{
  "status": "lowercase workflow stage key, e.g. 'in_progress', 'done'"
}`,
		example: `curl -X PATCH ${API_BASE}/external/tasks/<TASK_UUID>/status \\
  -H "Authorization: Bearer thk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "in_progress" }'`,
		response: `200 OK
{ "success": true, "data": { /* updated task */ } }`,
	},
];

const METHOD_COLOR: Record<Endpoint["method"], string> = {
	POST: "bg-success-subtle text-success border-success/20",
	GET: "bg-primary-subtle text-primary border-primary/20",
	PATCH: "bg-warning/15 text-warning border-warning/20",
};

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			toast.success("Copied to clipboard.");
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error("Copy failed.");
		}
	}
	return (
		<button
			type="button"
			onClick={copy}
			className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted-subtle"
			title="Copy"
		>
			{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
			{copied ? "Copied" : "Copy"}
		</button>
	);
}

function EndpointRow({ ep }: { ep: Endpoint }) {
	const [open, setOpen] = useState(false);
	const fullUrl = `${API_BASE}${ep.path}`;

	return (
		<div className="rounded-lg border border-border bg-surface">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center gap-3 px-3 py-2 text-left"
			>
				{open ? (
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				) : (
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				)}
				<span
					className={cn(
						"inline-flex w-14 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
						METHOD_COLOR[ep.method],
					)}
				>
					{ep.method}
				</span>
				<code className="flex-1 truncate font-mono text-[11px] text-foreground">
					{ep.path}
				</code>
				<span className="hidden shrink-0 rounded-md bg-muted-subtle px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
					{ep.scope}
				</span>
			</button>

			{open && (
				<div className="space-y-3 border-t border-border px-4 py-3">
					<p className="text-xs text-muted-foreground">{ep.summary}</p>

					<div className="flex items-center gap-2">
						<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							Required scope
						</span>
						<code className="rounded bg-muted-subtle px-1.5 py-0.5 text-[11px] text-foreground">
							{ep.scope}
						</code>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							URL
						</span>
						<code className="flex-1 truncate rounded bg-muted-subtle px-1.5 py-0.5 text-[11px] text-foreground">
							{fullUrl}
						</code>
						<CopyButton value={fullUrl} />
					</div>

					{ep.body && (
						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									Request body
								</p>
							</div>
							<pre className="overflow-x-auto rounded-md border border-border bg-muted-subtle p-3 text-[11px] leading-relaxed text-foreground">
								<code>{ep.body}</code>
							</pre>
						</div>
					)}

					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Example
							</p>
							<CopyButton value={ep.example} />
						</div>
						<pre className="overflow-x-auto rounded-md border border-border bg-muted-subtle p-3 text-[11px] leading-relaxed text-foreground">
							<code>{ep.example}</code>
						</pre>
					</div>

					<div className="space-y-1">
						<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							Response
						</p>
						<pre className="overflow-x-auto rounded-md border border-border bg-muted-subtle p-3 text-[11px] leading-relaxed text-foreground">
							<code>{ep.response}</code>
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}

export function ApiEndpointReference() {
	const [open, setOpen] = useState(true);

	return (
		<div className="rounded-lg border border-border bg-surface">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left"
			>
				<div className="flex flex-col">
					<span className="text-sm font-medium text-foreground">
						External API endpoints
					</span>
					<span className="text-[11px] text-muted-foreground">
						Base URL: <code>{API_BASE}</code>
					</span>
				</div>
				{open ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				)}
			</button>

			{open && (
				<div className="space-y-2 border-t border-border p-3">
					<p className="px-1 text-[11px] text-muted-foreground">
						All routes require{" "}
						<code className="rounded bg-muted-subtle px-1">
							Authorization: Bearer thk_live_…
						</code>{" "}
						and are scoped to the project bound to the API key.
					</p>
					{ENDPOINTS.map((ep) => (
						<EndpointRow key={`${ep.method} ${ep.path}`} ep={ep} />
					))}
				</div>
			)}
		</div>
	);
}
