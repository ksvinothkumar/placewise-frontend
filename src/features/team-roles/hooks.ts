import { useQuery } from '@tanstack/react-query';
import { branchesApi } from '@/api/endpoints/settings';
import { rolesApi } from '@/api/endpoints/roles';
import { usersApi } from '@/api/endpoints/users';
import { queryKeys } from '@/api/queryKeys';

export const rolesKey = [...queryKeys.roles.all, 'view'] as const;
export const usersKey = queryKeys.users.list();
// same key as the settings feature uses for /branches, so both share one cache entry
const branchesKey = [...queryKeys.settings.all, 'branches'] as const;

export const useRoles = () => useQuery({ queryKey: rolesKey, queryFn: () => rolesApi.list() });
export const useUsers = () => useQuery({ queryKey: usersKey, queryFn: () => usersApi.list() });
export const useBranchList = () => useQuery({ queryKey: branchesKey, queryFn: () => branchesApi.list(), retry: false });
