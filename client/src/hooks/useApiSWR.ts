import useSWR, {
	type SWRConfiguration,
	type SWRResponse,
	type Key,
} from "swr";

export type ApiKey = Key;

export function useApiSWR<T>(
	key: ApiKey,
	fetcher: () => Promise<T>,
	options?: SWRConfiguration<T, Error>,
): SWRResponse<T, Error> & { isLoading: boolean } {
	const swr = useSWR<T, Error>(key, key ? fetcher : null, options);
	return { ...swr, isLoading: !swr.data && !swr.error && !!key };
}
