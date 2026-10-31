import { crud } from './crud';

// TODO(port): replace unknown with the real type when the jobs feature is ported (src/features/...).
export const jobsApi = crud<{ id: string; [k: string]: unknown }>('/jobs');
