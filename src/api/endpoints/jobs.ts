import { http } from '../http';

export interface JobClient {
  id?: string;
  name: string;
  industry?: string;
  contact?: string;
  feePct?: number | null;
}

export interface Job {
  id: string;
  title: string;
  client?: JobClient | null;
  city: string;
  remote?: boolean;
  skills: string[];
  expMin: number;
  expMax: number;
  salMin: number;
  salMax: number;
  openings: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'open' | 'filled' | 'on-hold' | string;
  public?: boolean;
  /** the hiring pipeline; none means the default one */
  pipelineId?: string;
  description?: string;
  daysOpen?: number;
  pipelineCount?: number;
  best?: { score: number; name: string } | null;
  [k: string]: unknown;
}

export interface JobMatch {
  candidate: { id: string; name: string; title?: string; exp: number; city?: string };
  score: number;
  hit: string[];
  missing: string[];
  notes: string[];
}

export interface JobDetail extends Job {
  matches: JobMatch[];
  applications: { id: string; stage: string; score: number; candidate: { id: string; name: string } }[];
  booleanString: string;
}

export interface JobInput {
  title: string;
  client: string;
  city: string;
  remote: boolean;
  skills: string;
  expMin: number;
  expMax: number;
  salMin: number;
  salMax: number;
  openings: number;
  priority: string;
  description: string;
  public: boolean;
  branch?: string;
  pipelineId?: string;
}

export const jobsApi = {
  base: '/jobs',
  list: (status?: string) => http.get<Job[]>('/jobs', { status }),
  get: (id: string) => http.get<JobDetail>(`/jobs/${id}`),
  create: (body: JobInput) => http.post<Job>('/jobs', body),
  update: (id: string, body: Partial<Job>) => http.put<Job>(`/jobs/${id}`, body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/jobs/${id}`),
};
