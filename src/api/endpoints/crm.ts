import { http } from '../http';

export interface Company {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  website?: string;
  source?: string;
  stage: string;
  dealValue?: number;
  owner?: { id: string; name: string };
  contacts?: number;
  nextFollowUp?: string | null;
  followUpOverdue?: boolean;
  followUpNote?: string;
  notes?: string;
}
export interface Contact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  stage: string;
  isPrimary?: boolean;
  company?: { id: string; name: string } | null;
  owner?: { id: string; name: string };
  nextFollowUp?: string | null;
  followUpNote?: string;
  followUpOverdue?: boolean;
}
export interface CompanyDetail extends Omit<Company, 'contacts'> {
  contactList: Contact[];
  convertedClient?: { id: string; name: string } | null;
}
export interface CrmSummary {
  open: number;
  pipelineValue: number;
  overdue: number;
  today: number;
  wonThisMonth: number;
}
export type CompanyBody = Partial<Omit<Company, 'id' | 'owner' | 'contacts'>> & { owner?: string; nextFollowUp?: string };
export type ContactBody = Partial<Omit<Contact, 'id' | 'company' | 'owner'>> & { company?: string; owner?: string; nextFollowUp?: string };

export const crmApi = {
  companies: (q: { q?: string; owner?: string; stage?: string } = {}) => http.get<Company[]>('/crm/companies', q),
  company: (id: string) => http.get<CompanyDetail>(`/crm/companies/${id}`),
  summary: () => http.get<CrmSummary>('/crm/summary'),
  createCompany: (body: CompanyBody) => http.post<Company>('/crm/companies', body),
  updateCompany: (id: string, body: CompanyBody) => http.put<Company>(`/crm/companies/${id}`, body),
  setCompanyStage: (id: string, stage: string) => http.patch<Company>(`/crm/companies/${id}/stage`, { stage }),
  deleteCompany: (id: string) => http.delete<{ ok: boolean }>(`/crm/companies/${id}`),
  convert: (id: string) => http.post<{ client: { id: string; name: string } }>(`/crm/companies/${id}/convert`),
  contacts: (q: { q?: string; owner?: string; company?: string } = {}) => http.get<Contact[]>('/crm/contacts', q),
  createContact: (body: ContactBody) => http.post<Contact>('/crm/contacts', body),
  updateContact: (id: string, body: ContactBody) => http.put<Contact>(`/crm/contacts/${id}`, body),
  setContactStage: (id: string, stage: string) => http.patch<Contact>(`/crm/contacts/${id}/stage`, { stage }),
};
