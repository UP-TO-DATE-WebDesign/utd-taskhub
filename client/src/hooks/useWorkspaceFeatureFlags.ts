import { useApiSWR } from "./useApiSWR";
import {
	getWorkspaceFeatureFlags,
	type WorkspaceFeatureFlags,
} from "@/services/workspace-settings.service";

const DEFAULT_FLAGS: WorkspaceFeatureFlags = {
	enable_time_logging: true,
};

export function useWorkspaceFeatureFlags() {
	const { data, isLoading, error, mutate } = useApiSWR<WorkspaceFeatureFlags>(
		"workspace-feature-flags",
		getWorkspaceFeatureFlags,
		{ revalidateOnFocus: false },
	);

	return {
		flags: data ?? DEFAULT_FLAGS,
		loading: isLoading,
		error,
		refresh: mutate,
	};
}
