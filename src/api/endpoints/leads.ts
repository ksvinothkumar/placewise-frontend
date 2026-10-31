import { crud } from './crud';

// TODO(port): replace unknown with the real type when the leads feature is ported (src/features/...).
export const leadsApi = crud<{ id: string; [k: string]: unknown }>('/crm/leads');
