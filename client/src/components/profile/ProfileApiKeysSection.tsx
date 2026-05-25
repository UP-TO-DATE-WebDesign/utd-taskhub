import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	listApiKeys,
	type ApiKey,
	type CreatedApiKey,
} from "@/services/api-key.service";
import { ProfileApiKeysList } from "./ProfileApiKeysList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";
import { RevealApiKeyDialog } from "./RevealApiKeyDialog";
import { ApiKeyUsageExamples } from "./ApiKeyUsageExamples";

export function ProfileApiKeysSection() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [createOpen, setCreateOpen] = useState(false);
	const [reveal, setReveal] = useState<string | null>(null);

	function load() {
		setLoading(true);
		listApiKeys()
			.then(setKeys)
			.catch(() => toast.error("Failed to load API keys."))
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		load();
	}, []);

	function handleCreated(created: CreatedApiKey) {
		setReveal(created.key);
		const { key: _omit, ...rest } = created;
		setKeys((curr) => [rest as ApiKey, ...curr]);
	}

	function handleRevoked(id: string) {
		setKeys((curr) =>
			curr.map((k) =>
				k.id === id
					? { ...k, revoked_at: new Date().toISOString() }
					: k,
			),
		);
	}

	return (
		<Card className="p-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-sm font-semibold text-foreground">
						API Keys
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Let external apps create tickets and tasks in your
						projects.
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={() => setCreateOpen(true)}
				>
					<Plus className="h-3.5 w-3.5" />
					Generate API key
				</Button>
			</div>

			<Separator className="my-4" />

			{loading ? (
				<div className="space-y-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</div>
			) : (
				<ProfileApiKeysList
					keys={keys}
					setReveal={setReveal}
					onRevoked={handleRevoked}
				/>
			)}

			<div className="mt-6">
				<ApiKeyUsageExamples />
			</div>

			<CreateApiKeyDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>
			<RevealApiKeyDialog
				plaintext={reveal}
				onClose={() => setReveal(null)}
			/>
		</Card>
	);
}
