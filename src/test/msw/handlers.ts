import type { RequestHandler } from 'msw';

/** Default handlers shared by every test; individual tests add theirs with server.use(). */
export const handlers: RequestHandler[] = [];
