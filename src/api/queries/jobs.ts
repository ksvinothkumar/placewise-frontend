import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../endpoints/clients';
import { jobsApi } from '../endpoints/jobs';
import { queryKeys } from '../queryKeys';

export const useJobs = (status?: string) => useQuery({ queryKey: queryKeys.jobs.list({ status }), queryFn: () => jobsApi.list(status) });
export const useJob = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.jobs.detail(id ?? ''), queryFn: () => jobsApi.get(id as string), enabled: !!id });
export const useClients = (enabled = true) => useQuery({ queryKey: queryKeys.clients.list(), queryFn: clientsApi.list, enabled });
export const useClient = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.clients.detail(id ?? ''), queryFn: () => clientsApi.get(id as string), enabled: !!id });
export const useBranches = () => useQuery({ queryKey: ['settings', 'branches'], queryFn: clientsApi.branches, staleTime: 5 * 60_000 });
export const useStates = () => useQuery({ queryKey: ['settings', 'states'], queryFn: clientsApi.states, staleTime: Infinity });
