import { crud } from './crud';

// TODO(port): replace unknown with the real type when the webhooks feature is ported (src/features/...).
export const webhooksApi = crud<{ id: string; [k: string]: unknown }>('/webhooks');
