import { crud } from './crud';

// TODO(port): replace unknown with the real type when the applications feature is ported (src/features/...).
export const applicationsApi = crud<{ id: string; [k: string]: unknown }>('/applications');
