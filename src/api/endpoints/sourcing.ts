import { http } from '../http';

// TODO(port): boolean search + saved searches when features/sourcing is ported.
export const sourcingApi = { base: '/sourcing', search: <T = unknown>(body: unknown) => http.post<T>('/sourcing/search', body) };
