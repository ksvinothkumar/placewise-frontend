import type { QueryKey } from '@tanstack/react-query';
import { useApiMutation } from '@/api/hooks';
import { errorMessage } from '@/api/errors';
import { toast } from '@/stores/ui.store';

/**
 * Legacy `useSave` : run `fn`, toast on success/failure, invalidate server state, then call `onDone`.
 * Returns [busy, run] so forms keep the legacy `[busy, save]` shape.
 */
export function useSave<TData, TVars = void>(
  fn: (vars: TVars) => Promise<TData>,
  opts: { ok?: string; invalidate: QueryKey[]; onDone?: (r: TData) => void },
) {
  const m = useApiMutation(fn, {
    invalidate: opts.invalidate,
    onSuccess: (r) => {
      if (opts.ok) toast(opts.ok);
      opts.onDone?.(r);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return [m.isPending, (v: TVars) => m.mutate(v)] as const;
}
