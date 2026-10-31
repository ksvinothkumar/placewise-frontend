import { http } from '../http';

// TODO(port): check-in/out, leave, holidays when features/attendance is ported.
export const attendanceApi = {
  base: '/attendance',
  get: <T = unknown>(path = '', query?: Record<string, string>) => http.get<T>(`/attendance${path}`, query),
};
