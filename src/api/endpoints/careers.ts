import { http } from '../http';

// PUBLIC endpoints: no auth header is needed, but the shared client sends it harmlessly when present.
// TODO(port): open jobs + apply form when features/careers is ported.
export const careersApi = {
  base: '/careers',
  jobs: <T = unknown>() => http.get<T>('/careers/jobs'),
  job: <T = unknown>(id: string) => http.get<T>(`/careers/jobs/${id}`),
};
