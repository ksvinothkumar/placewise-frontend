import { useQuery } from '@tanstack/react-query';
import { branchesApi, settingsApi } from '@/api/endpoints/settings';
import { queryKeys } from '@/api/queryKeys';

export const settingsKeys = {
  view: [...queryKeys.settings.all, 'view'] as const,
  usage: [...queryKeys.settings.all, 'stage-usage'] as const,
  states: [...queryKeys.settings.all, 'states'] as const,
  branches: [...queryKeys.settings.all, 'branches'] as const,
};

export const useSettingsView = () => useQuery({ queryKey: settingsKeys.view, queryFn: () => settingsApi.get() });
export const useStageUsage = () => useQuery({ queryKey: settingsKeys.usage, queryFn: () => settingsApi.stageUsage(), retry: false });
export const useStates = () => useQuery({ queryKey: settingsKeys.states, queryFn: () => settingsApi.states(), staleTime: Infinity });
export const useBranches = () => useQuery({ queryKey: settingsKeys.branches, queryFn: () => branchesApi.list() });

/** Keys to refresh after anything stage-shaped changes (pipeline, candidates and every ad-hoc useApiQuery read). */
export const STAGE_INVALIDATIONS = [
  settingsKeys.view,
  settingsKeys.usage,
  queryKeys.applications.all,
  queryKeys.candidates.all,
  queryKeys.jobs.all,
  ['api'] as const,
];
