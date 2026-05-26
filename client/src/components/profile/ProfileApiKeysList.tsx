import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	revokeApiKey,
	getFullApiKey,
	type ApiKey,
	type ApiKeyScope,
} from "@/services/api-key.service";

function formatDateTime(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleString();
}

function formatDate(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleDateString();
}

function statusBadge(key: ApiKey): { label: string; cls: string } {
	if (key.revoked_at) {
		return {
			label: "Revoked",
			cls: "bg-danger-subtle text-danger border-danger/20",
		};
	}
	if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
		return {
			label: "Expired",
			cls: "bg-muted-subtle text-muted-foreground border-border",
		};
	}
	return {
		label: "Active",
		cls: "bg-success-subtle text-success border-success/20",
	};
}

export function ProfileApiKeysList({
	keys,
	setReveal,
	onRevoked,
}: {
	keys: ApiKey[];
	setReveal: (key: string) => void;
	onRevoked: (id: string) => void;
}) {
	const [revoking, setRevoking] = useState<string | null>(null);
	async function handleCopy(key: ApiKey) {
		const ok = window.confirm(
			`Are you sure you want to proceed?\n\nThis will update your api key to reveal the full key. If you have an active integration using this key, make sure to update it with the revealed key prefix and the same suffix after the reveal to avoid disruption.`,
		);
		if (!ok) return;
		try {
			await getFullApiKey(key.id).then((res) => {
				setReveal(res?.plaintext || "");
				key.key_prefix = res?.plaintext.slice(0, 16) || "";
			});

			toast.success("API key copied to clipboard.");
		} catch {
			toast.error("Failed to copy. Select the text and copy manually.");
		}
	}
	async function handleRevoke(key: ApiKey) {
		if (key.revoked_at) return;
		const ok = window.confirm(
			`Revoke "${key.name}"? External apps using this key will stop working immediately.`,
		);
		if (!ok) return;
		setRevoking(key.id);
		try {
			await revokeApiKey(key.id);
			toast.success("API key revoked.");
			onRevoked(key.id);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to revoke key.",
			);
		} finally {
			setRevoking(null);
		}
	}

	if (keys.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
				<KeyRound className="h-6 w-6 text-muted-foreground" />
				<p className="text-sm font-medium text-foreground">
					No API keys yet
				</p>
				<p className="max-w-sm text-xs text-muted-foreground">
					Generate a key to let an external app create tickets or
					tasks in one of your projects.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-border">
			<table className="w-full text-left text-xs">
				<thead className="border-b border-border bg-muted-subtle text-muted-foreground">
					<tr>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Name</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Project</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Key</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Scopes</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Last used</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Expires</th>
						<th className="whitespace-nowrap px-3 py-2 font-medium">Status</th>
						<th className="whitespace-nowrap px-3 py-2" />
					</tr>
				</thead>
				<tbody>
					{keys.map((k) => {
						const badge = statusBadge(k);

						return (
							<tr
								key={k.id}
								className="border-b border-border last:border-b-0"
							>
								<td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
									{k.name}
								</td>
								<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
									{k.project?.name ?? "—"}
								</td>
								<td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-foreground">
									{k.key_prefix}…
								</td>
								<td className="px-3 py-2">
									<div className="flex flex-wrap gap-1">
										{k.scopes.map((s: ApiKeyScope) => (
											<span
												key={s}
												className="rounded-md bg-muted-subtle px-1.5 py-0.5 text-[10px] text-muted-foreground"
											>
												{s}
											</span>
										))}
									</div>
								</td>
								<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
									{formatDateTime(k.last_used_at)}
								</td>
								<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
									{formatDate(k.expires_at)}
								</td>
								<td className="whitespace-nowrap px-3 py-2">
									<span
										className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
									>
										{badge.label}
									</span>
								</td>
								<td className="whitespace-nowrap px-3 py-2 gap-2 flex text-right">
									{!k.revoked_at && (
										<>
											<Button
												type="button"
												variant="primary_outline"
												size="xs"
												onClick={() => handleCopy(k)}
												title="This will update your api key to reveal the full key. If you have an active integration using this key, make sure to update it with the revealed key prefix and the same suffix after the reveal to avoid disruption."
											>
												<Copy className="h-3 w-3" />
												Copy
											</Button>
											<Button
												type="button"
												variant="destructive_outline"
												size="xs"
												disabled={revoking === k.id}
												onClick={() => handleRevoke(k)}
											>
												<Trash2 className="h-3 w-3" />
												{revoking === k.id
													? "Revoking…"
													: "Revoke"}
											</Button>
										</>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
