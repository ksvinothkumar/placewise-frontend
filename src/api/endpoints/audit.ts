import { http } from '../http';

export interface AuditEntry {
  id: string;
  createdAt: string;
  userName?: string;
  role?: string;
  action: string;
  entity: string;
  entityId?: string;
  path?: string;
  status: number;
  ip?: string;
}
export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pages: number;
  entities: string[];
}
export interface AuditQuery {
  q?: string;
  entity?: string;
  page?: number;
}

/** NOTE: the backend has no audit controller yet (src/modules/audit/presentation is empty); this is the legacy GET /api/audit contract. */
export const auditApi = {
  base: '/audit',
  list: (query: AuditQuery, signal?: AbortSignal) => http.get<AuditPage>('/audit', { ...query }, signal),
};
