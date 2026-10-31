import { http } from '../http';
import type { CandidateRef, ClientRef } from './applications';

export type InviteStatus = 'sent' | 'simulated' | 'failed' | 'skipped';
export interface Interview {
  id: string;
  when: string;
  duration?: number;
  mode: string;
  round?: string;
  interviewer: string;
  location?: string;
  notes?: string;
  inviteStatus?: InviteStatus | null;
  inviteSentAt?: string;
  inviteError?: string;
  application: { id: string; candidate: CandidateRef; job: { id?: string; title: string; client?: Pick<ClientRef, 'name'> & Partial<ClientRef> } };
}
export interface InviteResult {
  status: InviteStatus;
  error?: string;
  to?: string;
}
export interface InterviewBody {
  application?: string;
  when: string;
  duration: number;
  mode: string;
  round: string;
  interviewer: string;
  location: string;
  notes: string;
  sendInvite: boolean;
}
export interface InvitePreviewData {
  to: string;
  subject: string;
  html: string;
  status?: InviteStatus;
  live: boolean;
}
export interface Scorecard {
  id: string;
  reviewerName: string;
  overall: number | null;
  recommendation: string;
  comments?: string;
  ratings?: Record<string, number>;
  interview?: { round?: string };
}
export interface ScorecardBody {
  ratings: Record<string, number>;
  recommendation: string;
  comments: string;
}
export interface CandidateScorecards {
  items: Scorecard[];
  average: number | null;
  count: number;
}

export const interviewsApi = {
  base: '/interviews',
  list: (range?: { from?: string; to?: string }) => http.get<Interview[]>('/interviews', range),
  create: (body: InterviewBody) => http.post<Interview & { invite: InviteResult | null }>('/interviews', body),
  update: (id: string, body: Partial<InterviewBody>) => http.put<Interview & { invite: InviteResult | null }>(`/interviews/${id}`, body),
  cancel: (id: string) => http.delete<{ ok: boolean }>(`/interviews/${id}`),
  sendInvite: (id: string) => http.post<Interview & { invite: InviteResult }>(`/interviews/${id}/invite`),
  invitePreview: (id: string) => http.get<InvitePreviewData>(`/interviews/${id}/invite/preview`),
  scorecards: (id: string) => http.get<Scorecard[]>(`/interviews/${id}/scorecards`),
  saveScorecard: (id: string, body: ScorecardBody) => http.post<Scorecard>(`/interviews/${id}/scorecard`, body),
  candidateScorecards: (candidateId: string) => http.get<CandidateScorecards>(`/candidates/${candidateId}/scorecards`),
  calendarLink: () => http.get<{ path: string }>('/auth/calendar-link'),
  resetCalendarLink: () => http.post<{ path: string }>('/auth/calendar-link'),
};
