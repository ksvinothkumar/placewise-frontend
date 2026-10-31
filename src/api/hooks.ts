import { useMutation, useQuery, useQueryClient, type QueryKey, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from './errors';
import { http } from './http';
import { queryKeys } from './queryKeys';

type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * GET `path` and cache it under ['api', path, query]. Pass `null` as path to skip (e.g. missing permission).
 * Prefer feature-specific hooks with `queryKeys.*` for anything that needs targeted invalidation.
 */
export function useApiQuery<T>(path: string | null, query?: Query, options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<T, ApiError>({
    queryKey: queryKeys.path(path ?? '', query),
    queryFn: ({ signal }) => http.get<T>(path as string, query, signal),
    enabled: path !== null && (options?.enabled ?? true),
    ...options,
  });
}

/** Mutation that invalidates the given keys on success. `fn` usually calls an `api/endpoints/*` function. */
export function useApiMutation<TData, TVars = void>(
  fn: (vars: TVars) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'> & { invalidate?: QueryKey[] },
) {
  const qc = useQueryClient();
  const { invalidate, onSuccess, ...rest } = options ?? {};
  return useMutation<TData, ApiError, TVars>({
    mutationFn: fn,
    ...rest,
    onSuccess: async (...args) => {
      await Promise.all((invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })));
      return onSuccess?.(...args);
    },
  });
}

/** Unwrap list endpoints that may answer with either a bare array or a paged object. */
export const asList = <T>(d: T[] | { items: T[] } | null | undefined): T[] => (Array.isArray(d) ? d : (d?.items ?? []));
