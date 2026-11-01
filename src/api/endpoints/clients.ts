import { http } from '../http';

export interface Client {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  /** `data:image/…` URL or https link; empty when no logo is set */
  logo?: string;
  website?: string;
  about?: string;
  contact?: string;
  email?: string;
  feePct?: number | null;
  tier?: string;
  gstin?: string;
  state?: string;
  address?: string;
  pincode?: string;
  sez?: boolean;
  sezMode?: string;
  guaranteeDays?: number;
  paymentTermsDays?: number;
  openJobs?: number;
  placements?: number;
  /** finance fields: only present when the user may see money (redacted server-side otherwise) */
  billed?: number | null;
  forecast?: number | null;
  jobs?: { id: string; title: string; status?: string }[];
  [k: string]: unknown;
}

export const clientsApi = {
  base: '/clients',
  list: () => http.get<Client[]>('/clients'),
  get: (id: string) => http.get<Client>(`/clients/${id}`),
  create: (body: Record<string, unknown>) => http.post<Client>('/clients', body),
  update: (id: string, body: Record<string, unknown>) => http.put<Client>(`/clients/${id}`, body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/clients/${id}`),
  states: () => http.get<string[]>('/settings/states'),
  branches: () => http.get<{ id: string; name: string; active?: boolean }[]>('/branches'),
};
