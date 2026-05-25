import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ShieldAlert } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function RevealApiKeyDialog({
	plaintext,
	onClose,
}: {
	plaintext: string | null;
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const open = !!plaintext;

	async function copy() {
		if (!plaintext) return;
		try {
			await navigator.clipboard.writeText(plaintext);
			setCopied(true);
			toast.success("API key copied to clipboard.");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy. Select the text and copy manually.");
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Copy your API key</DialogTitle>
					<DialogDescription>
						This is the only time the full key will be shown.
						Store it in a safe place.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
						<ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
						<p>
							Treat this key like a password. Anyone with it can
							create tickets and tasks on your behalf in the
							selected project.
						</p>
					</div>

					<div className="flex items-center gap-2 rounded-md border border-border bg-muted-subtle p-3">
						<code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground">
							{plaintext}
						</code>
						<Button type="button" size="xs" onClick={copy}>
							{copied ? (
								<Check className="h-3 w-3" />
							) : (
								<Copy className="h-3 w-3" />
							)}
							{copied ? "Copied" : "Copy"}
						</Button>
					</div>
				</div>

				<DialogFooter>
					<Button type="button" size="sm" onClick={onClose}>
						I've saved it
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
