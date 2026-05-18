import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UiTask } from "@/components/tasks/types";
import type {
	Sprint,
	StartSprintResponse,
} from "@/services/sprint.service";
import { usePermission } from "@/hooks/usePermission";
import { StartSprintModal } from "./StartSprintModal";

const ALLOWED_ROLES = new Set(["admin", "manager"]);

interface Props {
	nextSprint: Sprint | null;
	candidateTasks: UiTask[];
	onStarted: (result: StartSprintResponse) => void;
}

export function StartSprintButton({
	nextSprint,
	candidateTasks,
	onStarted,
}: Props) {
	const [open, setOpen] = useState(false);
	const { roleKey } = usePermission();
	if (!nextSprint) return null;
	if (!roleKey || !ALLOWED_ROLES.has(roleKey)) return null;

	return (
		<>
			<Button
				variant="outline"
				className="flex items-center gap-2"
				onClick={() => setOpen(true)}
			>
				<Play className="h-4 w-4" />
				Start Sprint
			</Button>
			<StartSprintModal
				open={open}
				onClose={() => setOpen(false)}
				sprint={nextSprint}
				candidateTasks={candidateTasks}
				onStarted={onStarted}
			/>
		</>
	);
}
