import { crud } from './crud';

// TODO(port): replace unknown with the real type when the interviews feature is ported (src/features/...).
export const interviewsApi = crud<{ id: string; [k: string]: unknown }>('/interviews');
