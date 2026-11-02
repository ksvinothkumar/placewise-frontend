import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { candidatesApi, savedSearchesApi, type CandidateFilters } from '../endpoints/candidates';
import { tasksApi } from '../endpoints/tasks';
import type { ApiError } from '../errors';
import { queryKeys } from '../queryKeys';

const k = queryKeys.candidates;

export const useCandidates = (f: CandidateFilters) =>
  useQuery({ queryKey: k.list(f), queryFn: () => candidatesApi.list(f), placeholderData: keepPreviousData });
export const useCandidatePage = (f: CandidateFilters, page: number, limit: number) =>
  useQuery({ queryKey: [...k.list(f), 'page', page, limit], queryFn: () => candidatesApi.listPage(f, page, limit), placeholderData: keepPreviousData });
export const useCandidate = (id: string | undefined) =>
  useQuery({ queryKey: k.detail(id ?? ''), queryFn: () => candidatesApi.get(id as string), enabled: !!id });
export const useCandidateSkills = () => useQuery({ queryKey: [...k.all, 'skills'], queryFn: candidatesApi.skills });
export const useCandidateTags = () => useQuery({ queryKey: [...k.all, 'tags'], queryFn: candidatesApi.tags });
export const useSavedSearches = () => useQuery({ queryKey: [...k.all, 'saved-searches'], queryFn: savedSearchesApi.list });
export const useDuplicates = () => useQuery({ queryKey: [...k.all, 'duplicates'], queryFn: candidatesApi.duplicates });
export const useResumeView = (id: string) =>
  useQuery<Awaited<ReturnType<typeof candidatesApi.resumeView>>, ApiError>({
    queryKey: [...k.detail(id), 'resume-view'],
    queryFn: () => candidatesApi.resumeView(id),
    retry: false,
  });
export const useCandidateTasks = (id: string) =>
  useQuery({ queryKey: [...queryKeys.tasks.all, 'candidate', id], queryFn: () => tasksApi.list({ candidate: id, status: 'open' }) });
