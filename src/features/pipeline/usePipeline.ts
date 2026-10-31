import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type Application } from '@/api/endpoints/applications';
import { dashboardKey } from '@/api/endpoints/dashboard';
import { errorMessage, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { stageKind } from '@/lib/format';
import { toast } from '@/stores/ui.store';

export const pipelineKey = (job: string) => queryKeys.applications.list({ job: job || undefined });

export function useApplications(job: string) {
  return useQuery<Application[], ApiError>({
    queryKey: pipelineKey(job),
    queryFn: () => applicationsApi.list(job ? { job } : undefined),
  });
}

/** PATCH /applications/:id/stage with an optimistic card move; a failure puts the card back and shows the server message. */
export function useMoveStage(job: string) {
  const qc = useQueryClient();
  const key = pipelineKey(job);
  return useMutation<Application, ApiError, { id: string; stage: string }, { prev?: Application[] }>({
    mutationFn: ({ id, stage }) => applicationsApi.moveStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Application[]>(key);
      qc.setQueryData<Application[]>(key, (list) => list?.map((a) => (a.id === id ? { ...a, stage, daysInStage: 0 } : a)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast(errorMessage(e), 'error');
    },
    onSuccess: (_d, { stage }) => toast(stageKind(stage) === 'placed' ? 'Placement booked 🎉' : `Moved to ${stage}`),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      void qc.invalidateQueries({ queryKey: dashboardKey });
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}
