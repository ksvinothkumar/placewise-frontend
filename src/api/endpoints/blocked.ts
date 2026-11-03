import { http } from '../http';

export interface BlockedEmail {
  id: string;
  email: string;
  name?: string;
  reason?: string;
  candidate?: string;
  blockedByName?: string;
  createdAt?: string;
}
export interface BlockInput {
  candidate?: string;
  email?: string;
  name?: string;
  reason?: string;
}

const base = '/blocked-candidates';
export const blockedApi = {
  list: () => http.get<BlockedEmail[]>(base),
  add: (body: BlockInput) => http.post<BlockedEmail>(base, body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`${base}/${id}`),
};
