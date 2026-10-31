import { crud } from './crud';

// TODO(port): replace unknown with the real type when the users feature is ported (src/features/...).
export const usersApi = crud<{ id: string; [k: string]: unknown }>('/users');
