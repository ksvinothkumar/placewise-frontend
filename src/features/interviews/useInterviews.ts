import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardKey } from '@/api/endpoints/dashboard';
import { interviewsApi, type Interview, type InviteResult } from '@/api/endpoints/interviews';
import { errorMessage, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { toast } from '@/stores/ui.store';

export function useInterviewRange(from: Date, to: Date) {
  const range = { from: from.toISOString(), to: to.toISOString() };
  return useQuery<Interview[], ApiError>({ queryKey: queryKeys.interviews.list(range), queryFn: () => interviewsApi.list(range) });
}

export function useRefreshInterviews() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.interviews.all });
    void qc.invalidateQueries({ queryKey: dashboardKey });
    void qc.invalidateQueries({ queryKey: queryKeys.applications.all });
  };
}

export const inviteToast = (inv: InviteResult | null | undefined, verb: string) => {
  if (!inv) return toast(verb);
  if (inv.status === 'sent') return toast(`${verb}. Invite emailed to ${inv.to}`);
  if (inv.status === 'simulated') return toast(`${verb}. Invite prepared for ${inv.to} (email not configured)`);
  if (inv.status === 'failed') return toast(`${verb}, but the invite failed: ${inv.error}`, 'error');
  return toast(verb);
};

export function useCancelInterview(onDone: () => void) {
  const refresh = useRefreshInterviews();
  return useMutation<unknown, ApiError, Interview>({
    mutationFn: (x) => interviewsApi.cancel(x.id),
    onSuccess: (_d, x) => {
      toast(['sent', 'simulated'].includes(x.inviteStatus ?? '') ? 'Interview cancelled and candidate notified' : 'Interview cancelled');
      onDone();
      refresh();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
}

export function useSendInvite() {
  const refresh = useRefreshInterviews();
  return useMutation<unknown, ApiError, Interview>({
    mutationFn: async (x) => {
      const r = await interviewsApi.sendInvite(x.id);
      const s = r.invite?.status;
      toast(
        s === 'sent' ? 'Invite emailed' : s === 'simulated' ? 'Invite prepared (email not configured)' : s === 'skipped' ? 'Candidate has no email' : 'Invite failed: ' + r.invite?.error,
        s === 'failed' ? 'error' : 'ok',
      );
      return r;
    },
    onSettled: refresh,
    onError: (e) => toast(errorMessage(e), 'error'),
  });
}
