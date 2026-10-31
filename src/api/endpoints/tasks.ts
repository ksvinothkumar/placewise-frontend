import { crud } from './crud';

// TODO(port): replace unknown with the real type when the tasks feature is ported (src/features/...).
export const tasksApi = crud<{ id: string; [k: string]: unknown }>('/tasks');
