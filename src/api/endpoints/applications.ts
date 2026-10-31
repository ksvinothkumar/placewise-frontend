import { http } from '../http';
import { crud } from './crud';

export interface ClientRef {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  feePct?: number;
}
export interface JobRef {
  id: string;
  title: string;
  city?: string;
  openedAt?: string;
  openings?: number;
  client?: ClientRef;
}
export interface CandidateRef {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  city?: string;
  photoAt?: string | null;
  exp?: number;
  expected?: number;
  skills?: string[];
  source?: string;
}
export type ClientDecision = 'interested' | 'hold' | 'not_fit';
export interface Application {
  id: string;
  stage: string;
  stageChangedAt: string;
  daysInStage: number;
  score: number;
  candidate: CandidateRef;
  job: JobRef;
  clientFeedback?: { decision?: ClientDecision; comment?: string } | null;
}
export type OfferStatus = 'offered' | 'accepted' | 'declined' | 'withdrawn';
export interface Offer {
  id: string;
  status: OfferStatus;
  ctc: number;
  joiningDate?: string;
  offeredAt?: string;
  notes?: string;
}

/** Legacy routes (api.js, business.js). The backend module for applications was still being written when this was ported. */
export const applicationsApi = {
  ...crud<Application>('/applications'),
  list: (query?: { job?: string }) => http.get<Application[]>('/applications', query),
  moveStage: (id: string, stage: string) => http.patch<Application>(`/applications/${id}/stage`, { stage }),
  add: (candidate: string, job: string) => http.post<{ id: string }>('/applications', { candidate, job }),
  emailDraft: (id: string, kind: string) => http.get<{ subject: string; body: string }>(`/applications/${id}/email`, { kind }),
  getOffer: (applicationId: string) => http.get<{ offer: Offer | null }>(`/applications/${applicationId}/offer`),
  createOffer: (applicationId: string, body: { ctc: number; joiningDate?: string; notes?: string }) =>
    http.post<{ offer: Offer }>(`/applications/${applicationId}/offer`, body),
  setOfferStatus: (offerId: string, status: OfferStatus) => http.put<{ offer: Offer }>(`/offers/${offerId}`, { status }),
};
