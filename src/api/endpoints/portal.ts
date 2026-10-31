import { http } from '../http';
import type { ClientDecision } from './applications';

export interface PortalJobSummary {
  id: string;
  title: string;
  city?: string;
  status: string;
  openings: number;
  shortlisted: number;
  awaitingFeedback: number;
  interviewing: number;
  offers: number;
  placed: number;
}
export interface PortalInterview {
  id: string;
  when: string;
  round?: string;
  mode: string;
  location?: string;
  duration?: number;
  response?: { response: 'confirm' | 'reschedule' } | null;
}
export interface PortalShortlistItem {
  applicationId: string;
  stage: string;
  candidate: {
    id: string;
    name: string;
    title?: string;
    exp?: number;
    city?: string;
    skills?: string[];
    expected?: number;
    notice?: number;
    summary?: string;
    education?: string;
    score?: number;
  };
  feedback?: { decision: ClientDecision; comment?: string; at: string } | null;
  interviews: PortalInterview[];
}
export interface PortalJobDetail {
  job: { id: string; title: string; city?: string; remote?: boolean; skills?: string[]; expMin?: number; expMax?: number; openings: number };
  shortlist: PortalShortlistItem[];
}

export const portalApi = {
  jobs: () => http.get<PortalJobSummary[]>('/portal/jobs'),
  job: (id: string) => http.get<PortalJobDetail>(`/portal/jobs/${id}`),
  feedback: (applicationId: string, body: { decision: ClientDecision; comment: string }) =>
    http.post<{ ok: boolean }>(`/portal/applications/${applicationId}/feedback`, body),
  respond: (interviewId: string, body: { response: 'confirm' | 'reschedule'; comment: string }) =>
    http.post<{ ok: boolean }>(`/portal/interviews/${interviewId}/respond`, body),
};
