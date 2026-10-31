import { crud } from './crud';

// TODO(port): replace unknown with the real type when the roles feature is ported (src/features/...).
export const rolesApi = crud<{ id: string; [k: string]: unknown }>('/roles');
