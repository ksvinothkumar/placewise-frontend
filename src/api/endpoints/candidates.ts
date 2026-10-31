import { crud } from './crud';

// TODO(port): replace unknown with the real type when the candidates feature is ported (src/features/...).
export const candidatesApi = crud<{ id: string; [k: string]: unknown }>('/candidates');
