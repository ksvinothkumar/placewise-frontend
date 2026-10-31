import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi, type Company, type CompanyDetail } from '@/api/endpoints/crm';
import { errorMessage, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/endpoints/settings';
import { toast } from '@/stores/ui.store';

export const crmKeys = {
  all: ['crm'] as const,
  companies: (q: object) => ['crm', 'companies', q] as const,
  company: (id: string) => ['crm', 'company', id] as const,
  contacts: (q: object) => ['crm', 'contacts', q] as const,
  summary: ['crm', 'summary'] as const,
};

export function useCrmStages() {
  const { data } = useQuery({ queryKey: [...queryKeys.settings.all, 'view'], queryFn: () => settingsApi.get() });
  return { company: data?.crmStages ?? [], contact: data?.contactStages ?? [] };
}

export function useCompanies(q: { q: string; owner: string }) {
  return useQuery({ queryKey: crmKeys.companies(q), queryFn: () => crmApi.companies(q) });
}
export function useCompany(id: string) {
  return useQuery<CompanyDetail, ApiError>({ queryKey: crmKeys.company(id), queryFn: () => crmApi.company(id) });
}

/** PATCH company stage. On the board the card is moved optimistically (query key = the board's list key). */
export function useSetCompanyStage(listKey?: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation<Company, ApiError, { id: string; stage: string }, { prev?: Company[] }>({
    mutationFn: ({ id, stage }) => crmApi.setCompanyStage(id, stage),
    onMutate: async ({ id, stage }) => {
      if (!listKey) return {};
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData<Company[]>(listKey);
      qc.setQueryData<Company[]>(listKey, (l) => l?.map((c) => (c.id === id ? { ...c, stage } : c)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (listKey && ctx?.prev) qc.setQueryData(listKey, ctx.prev);
      toast(errorMessage(e), 'error');
    },
    onSuccess: (_d, { stage }) => toast(`Moved to ${stage}`),
    onSettled: () => void qc.invalidateQueries({ queryKey: crmKeys.all }),
  });
}
