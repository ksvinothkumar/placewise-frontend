import { http } from '../http';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export interface Registration {
  id: string;
  kind: 'agency' | 'freelancer';
  plan: 'free' | 'pro';
  workspaceName: string;
  workspaceSlug: string;
  agencyName: string;
  contactPerson: string;
  mobile?: string;
  email: string;
  country?: string;
  website?: string;
  status: RegistrationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}
export interface RegistrationList {
  items: Registration[];
  counts: Record<RegistrationStatus, number>;
}

export const registrationsApi = {
  base: '/registrations',
  list: (status?: RegistrationStatus, signal?: AbortSignal) => http.get<RegistrationList>('/registrations', status ? { status } : {}, signal),
  approve: (id: string, role: string) => http.post<Registration>(`/registrations/${id}/approve`, { role }),
  reject: (id: string, note: string) => http.post<Registration>(`/registrations/${id}/reject`, { note }),
};
