import { crud } from './crud';

// TODO(port): replace unknown with the real type when the invoices feature is ported (src/features/...).
export const invoicesApi = crud<{ id: string; [k: string]: unknown }>('/invoices');
