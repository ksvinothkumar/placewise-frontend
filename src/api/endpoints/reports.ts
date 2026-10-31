import { http } from '../http';

// TODO(port): dashboard + reports read models when features/reports and features/dashboard are ported.
export const reportsApi = {
  base: '/reports',
  get: <T = unknown>(path = '', query?: Record<string, string>) => http.get<T>(`/reports${path}`, query),
};
