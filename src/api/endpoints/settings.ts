import { http } from '../http';

// TODO(port): org settings, pipeline stages, GST profile when features/settings is ported.
export const settingsApi = {
  base: '/settings',
  get: <T = unknown>() => http.get<T>('/settings'),
  update: <T = unknown>(body: unknown) => http.put<T>('/settings', body),
};
