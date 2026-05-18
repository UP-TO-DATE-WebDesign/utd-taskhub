import { toast } from "sonner";

export function reportError(e: unknown) {
	toast.error("Failed to update task", {
		description: (e as Error).message || "Please try again.",
	});
}
