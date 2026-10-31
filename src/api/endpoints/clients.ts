import { crud } from './crud';

// TODO(port): replace unknown with the real type when the clients feature is ported (src/features/...).
export const clientsApi = crud<{ id: string; [k: string]: unknown }>('/clients');
