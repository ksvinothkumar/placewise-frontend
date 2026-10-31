import { http } from '../http';
import type { Application, CandidateRef, JobRef } from './applications';

// Candidate helpers used by the shared business components (merge, bulk import, email, timeline, quick view).
// Legacy routes: api.js `/candidates/*`, comms.js `/templates`.
export interface DuplicateCandidate {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  city?: string;
  applications: number;
  hasResume: boolean;
  skills: string[];
}
export interface MergeResult {
  movedApplications: number;
}
export interface BulkResult {
  created: number;
  duplicates: number;
  failed: number;
  results: { file: string; status: 'created' | 'duplicate' | 'failed'; candidate?: { id: string; name: string; skills?: number }; error?: string }[];
}
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}
export interface EmailResult {
  status: 'sent' | 'simulated' | 'failed';
  to?: string;
}
export interface TimelineEvent {
  type: string;
  title: string;
  detail?: string;
  at: string;
}
export interface CandidateDetail extends CandidateRef {
  company?: string;
  notice?: number;
  tags?: string[];
  applications: (Pick<Application, 'id' | 'stage'> & { job: JobRef })[];
  bestJobs: { job: JobRef; score: number; notes: string[]; inPipeline: boolean }[];
}

export const candidateToolsApi = {
  detail: (id: string) => http.get<CandidateDetail>(`/candidates/${id}`),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/candidates/${id}`),
  setTags: (id: string, tags: string[]) => http.put<CandidateDetail>(`/candidates/${id}`, { tags }),
  duplicates: () => http.get<DuplicateCandidate[][]>('/candidates/duplicates'),
  merge: (keep: string, remove: string[]) => http.post<MergeResult>('/candidates/merge', { keep, remove }),
  bulkImport: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return http.upload<BulkResult>('/candidates/bulk', fd);
  },
  sendEmail: (id: string, body: { subject: string; body: string }) => http.post<EmailResult>(`/candidates/${id}/email`, body),
  timeline: (id: string) => http.get<TimelineEvent[]>(`/candidates/${id}/timeline`),
  templates: () => http.get<EmailTemplate[]>('/templates'),
  saveTemplate: (body: { name: string; subject: string; body: string }) => http.post<EmailTemplate>('/templates', body),
  deleteTemplate: (id: string) => http.delete<{ ok: boolean }>(`/templates/${id}`),
  ai: <T>(path: string, body: unknown) => http.post<T & { engine?: string }>(`/ai${path}`, body),
};
