import { http } from '../http';

export interface CareerJob {
  id: string;
  title: string;
  city: string;
  remote?: boolean;
  industry?: string;
  expMin: number;
  expMax: number;
  skills: string[];
  postedDays: number;
  description?: string;
}

// PUBLIC endpoints (backend: /api/v1/public/jobs, legacy /api/public/jobs). No login; the client harmlessly sends the token when present.
export const careersApi = {
  base: '/public/jobs',
  jobs: () => http.get<CareerJob[]>('/public/jobs'),
  job: (id: string) => http.get<CareerJob>(`/public/jobs/${id}`),
  /** multipart: text fields + optional `resume` file; `website` is the honeypot (must stay empty for real people) */
  apply: (id: string, form: FormData) => http.upload<{ ok?: boolean }>(`/public/jobs/${id}/apply`, form),
};
