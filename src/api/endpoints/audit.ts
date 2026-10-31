import { http } from '../http';

// TODO(port): audit log list/filter when features/audit is ported.
export const auditApi = { base: '/audit', list: <T = unknown>(query?: Record<string, string>) => http.get<T>('/audit', query) };
