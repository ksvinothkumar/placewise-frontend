import { http as msw, HttpResponse, type RequestHandler } from 'msw';

/** Default handlers shared by every test; individual tests add theirs with server.use(). */
export const handlers: RequestHandler[] = [
  // the pipeline pickers read the settings view; most tests do not care about it
  msw.get('*/settings', () => HttpResponse.json({ data: { stages: [], crmStages: [], contactStages: [], pipelines: [] } })),
];
