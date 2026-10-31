import { http } from '../http';

export interface ReportData {
  kpis: { placements: number; submissions: number; avgDaysToFill: number | null; offerAcceptRate: number | null; revenue?: number };
  funnel: { stage: string; count: number; conversion?: number | null }[];
  monthly: { month: string; placements: number; avgDaysToFill: number | null }[];
  recruiters: {
    id?: string;
    name: string;
    role?: string;
    added: number;
    pipeline: number;
    submissions: number;
    interviews: number;
    offers: number;
    placements: number;
    revenue?: number;
    commission?: number;
    targetProgress?: { done: number; goal: number } | null;
  }[];
  sources: { source: string; candidates: number; inPipeline: number; placements: number; rate: number }[];
  jobAging: { bucket: string; count: number }[];
  revenueByClient?: { client: string; invoiced: number; outstanding: number }[];
}
export interface ClientReport {
  client: { name: string; email?: string };
  days: number;
  generated: string;
  jobs: { id: string; title: string; daysOpen: number; inPipeline: number; submitted: number; interviewing: number; offers: number; placed: number; openings: number }[];
  newSubmissions: { candidate: string; title?: string; exp?: number }[];
  upcomingInterviews: { candidate: string; round?: string; mode: string; when: string }[];
  placements: { candidate: string; on: string }[];
}
export interface ReportSendResult {
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
  to?: string;
}

export const reportsApi = {
  base: '/reports',
  get: <T = unknown>(path = '', query?: Record<string, string>) => http.get<T>(`/reports${path}`, query),
  overview: (from: string) => http.get<ReportData>('/reports', { from }),
  clientReport: (clientId: string, days: number) => http.get<ClientReport>(`/clients/${clientId}/report`, { days }),
  sendClientReport: (clientId: string, days: number) => http.post<ReportSendResult>(`/clients/${clientId}/report/send`, { days }),
};
