import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { asList, useApiQuery } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import type { Conversation } from '@/api/types';
import { useCan } from '@/lib/permissions';
import { useChannel } from '@/realtime/useChannel';
import { useNotifications } from '../Notifications';

/** Live badge numbers for the sidebar and the document title. Failures (endpoint not ported yet) simply show no count. */
export function useNavCounts() {
  const qc = useQueryClient();
  const canJobs = useCan('jobs:view');
  const canCands = useCan('candidates:view');
  const jobs = useApiQuery<unknown[]>(canJobs ? '/jobs' : null, { status: 'open' }, { retry: false, staleTime: 60_000 });
  const cands = useApiQuery<unknown[]>(canCands ? '/candidates' : null, undefined, { retry: false, staleTime: 60_000 });
  const convs = useApiQuery<Conversation[]>('/chat/conversations', undefined, { retry: false });
  const { unread: notifUnread } = useNotifications();

  // Any chat activity means the unread totals changed.
  useChannel('message', () => void qc.invalidateQueries({ queryKey: queryKeys.conversations }));
  useChannel('read', () => void qc.invalidateQueries({ queryKey: queryKeys.conversations }));

  const chatUnread = asList(convs.data).reduce((t, c) => t + (c.unread || 0), 0);
  const badge = chatUnread + notifUnread;
  useEffect(() => {
    document.title = (badge ? `(${badge}) ` : '') + 'Placewise · Recruitment Suite';
  }, [badge]);

  return {
    counts: {
      '/jobs': jobs.data ? asList(jobs.data).length : undefined,
      '/candidates': cands.data ? asList(cands.data).length : undefined,
      '/chat': chatUnread || undefined,
    } as Record<string, number | undefined>,
  };
}
