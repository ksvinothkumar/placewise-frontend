import { http } from '../http';

type Query = Record<string, string | number | boolean | null | undefined>;

export interface ResumeFileMeta {
  name?: string;
  ext?: string;
  size?: number;
  at?: string;
}

export interface Candidate {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  exp: number;
  expected: number;
  currentCtc?: number;
  notice: number;
  skills: string[];
  tags?: string[];
  source?: string;
  photoAt?: string | null;
  resumeFile?: ResumeFileMeta | null;
  pipelines?: number;
  linkedin?: string;
  education?: string;
  summary?: string;
  notes?: string;
  relocate?: boolean;
  consent?: { given?: boolean; at?: string } | null;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface CandidateJobRef {
  id: string;
  title: string;
  city?: string;
  client?: { id: string; name: string; contact?: string; email?: string; feePct?: number };
}

export interface CandidateApplication {
  id: string;
  stage: string;
  score: number;
  createdAt: string;
  job: CandidateJobRef;
  history?: { stage: string; at: string }[];
  clientFeedback?: { decision?: 'interested' | 'hold' | 'not_fit'; comment?: string; by?: string } | null;
}

export interface CandidateOffer {
  id: string;
  application: string;
  status: 'offered' | 'accepted' | 'declined' | 'withdrawn';
  ctc: number;
  joiningDate?: string;
  offeredAt: string;
  notes?: string;
}

export interface CandidateDetail extends Candidate {
  applications: CandidateApplication[];
  bestJobs: { job: CandidateJobRef; score: number; notes: string[]; inPipeline: boolean }[];
  offers?: CandidateOffer[];
  interviews?: { id: string; round: string; jobTitle: string; when: string; mode: string; interviewer: string }[];
}

export interface CandidateFilters {
  q?: string;
  skill?: string;
  city?: string;
  sort?: string;
  tag?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: CandidateFilters;
}

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

export interface ParsedResume {
  parsed: Partial<Candidate> & { skills?: string[] | string };
  text?: string;
  engine?: string;
  fileName?: string;
  duplicate?: { id: string; name: string } | null;
}

export interface BulkImportResult {
  created: number;
  duplicates: number;
  failed: number;
  results: { file: string; status: 'created' | 'duplicate' | 'failed'; error?: string; candidate?: { id: string; name: string; skills?: number } }[];
}

export type ResumeView =
  | { kind: 'pdf' | 'image'; name: string; size?: number; at?: string }
  | { kind: 'docx'; name: string; size?: number; at?: string; html: string }
  | { kind: 'text'; name: string; size?: number; at?: string; text: string };

const base = '/candidates';

export const candidatesApi = {
  base,
  list: (f: CandidateFilters) => http.get<Candidate[]>(base, f as Query),
  get: (id: string) => http.get<CandidateDetail>(`${base}/${id}`),
  create: (body: Record<string, unknown>, force = false) => http.post<Candidate>(base + (force ? '?force=1' : ''), body),
  update: (id: string, body: Record<string, unknown>) => http.put<Candidate>(`${base}/${id}`, body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`${base}/${id}`),
  skills: () => http.get<string[]>(`${base}/skills`),
  tags: () => http.get<string[]>(`${base}/tags`),
  duplicates: () => http.get<DuplicateCandidate[][]>(`${base}/duplicates`),
  merge: (keep: string, remove: string[]) => http.post<{ movedApplications: number }>(`${base}/merge`, { keep, remove }),
  parse: (form: FormData) => http.upload<ParsedResume>(`${base}/parse`, form),
  bulk: (form: FormData) => http.upload<BulkImportResult>(`${base}/bulk`, form),
  resumeView: (id: string) => http.get<ResumeView>(`${base}/${id}/resume/view`),
  uploadResume: (id: string, form: FormData) => http.upload<unknown>(`${base}/${id}/resume`, form),
  removeResume: (id: string) => http.delete<unknown>(`${base}/${id}/resume`),
  resumeBlobUrl: (id: string) => http.blobUrl(`${base}/${id}/resume`),
  resumeDownload: (id: string) => http.blob(`${base}/${id}/resume?download=1`),
  exportData: (id: string) => http.get<unknown>(`${base}/${id}/export`),
  setConsent: (id: string, given: boolean) => http.put<unknown>(`${base}/${id}/consent`, { given }),
};

export const savedSearchesApi = {
  list: () => http.get<SavedSearch[]>('/saved-searches'),
  create: (name: string, filters: CandidateFilters) => http.post<SavedSearch>('/saved-searches', { name, filters }),
  remove: (id: string) => http.delete<unknown>(`/saved-searches/${id}`),
};
