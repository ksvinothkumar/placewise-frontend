import { HttpResponse, http as mswHttp } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { ApiError } from './errors';
import { getAccessToken, http, setAccessToken, setAuthLostHandler } from './http';

const A = 'http://localhost:4100/api/v1';
const ok = <T>(data: T, meta: object = {}) => HttpResponse.json({ data, meta: { requestId: 'r1', ...meta } });
const fail = (status: number, code: string, message: string, extra: object = {}) =>
  HttpResponse.json({ error: { code, message, requestId: 'req-9', ...extra } }, { status });

const authLost = vi.fn();
beforeEach(() => {
  setAccessToken(null);
  authLost.mockClear();
  setAuthLostHandler(authLost);
});

describe('envelope unwrap', () => {
  it('returns data and sends the bearer token', async () => {
    setAccessToken('tok');
    let auth: string | null = null;
    server.use(mswHttp.get(`${A}/jobs`, ({ request }) => ((auth = request.headers.get('authorization')), ok([{ id: '1' }]))));
    expect(await http.get('/jobs')).toEqual([{ id: '1' }]);
    expect(auth).toBe('Bearer tok');
  });

  it('exposes meta (paging, requestId) through raw()', async () => {
    server.use(mswHttp.get(`${A}/jobs`, () => ok([], { page: 2, total: 40 })));
    const r = await http.raw('/jobs');
    expect(r.meta).toMatchObject({ page: 2, total: 40, requestId: 'r1' });
  });

  it('serialises query params and skips empty ones', async () => {
    let url = '';
    server.use(mswHttp.get(`${A}/jobs`, ({ request }) => ((url = request.url), ok([]))));
    await http.get('/jobs', { status: 'open', q: '', page: 2, none: undefined });
    expect(url).toBe(`${A}/jobs?status=open&page=2`);
  });

  it('handles 204 No Content', async () => {
    server.use(mswHttp.post(`${A}/auth/logout`, () => new HttpResponse(null, { status: 204 })));
    expect(await http.post('/auth/logout')).toBeUndefined();
  });

  it('sends JSON bodies with credentials-friendly headers', async () => {
    let body: unknown;
    let ct: string | null = null;
    server.use(
      mswHttp.post(
        `${A}/jobs`,
        async ({ request }) => ((ct = request.headers.get('content-type')), (body = await request.json()), ok({ id: '2' })),
      ),
    );
    await http.post('/jobs', { title: 'x' });
    expect(body).toEqual({ title: 'x' });
    expect(ct).toBe('application/json');
  });
});

describe('error mapping', () => {
  it('maps the error envelope to ApiError', async () => {
    server.use(
      mswHttp.get(`${A}/jobs`, () => fail(400, 'VALIDATION_FAILED', 'Request validation failed', { details: ['title must be a string'] })),
    );
    const err = (await http.get('/jobs').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      details: ['title must be a string'],
      requestId: 'req-9',
    });
  });

  it('falls back to a generic error for non-JSON bodies (proxy errors)', async () => {
    server.use(mswHttp.get(`${A}/jobs`, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));
    const err = (await http.get('/jobs').catch((e) => e)) as ApiError;
    expect(err).toMatchObject({ status: 502, code: 'HTTP_502' });
    expect(err.message).toMatch(/wrong on our side/);
  });

  it('maps connection failures to a NETWORK_ERROR with status 0', async () => {
    server.use(mswHttp.get(`${A}/jobs`, () => HttpResponse.error()));
    const err = (await http.get('/jobs').catch((e) => e)) as ApiError;
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(err.isNetwork).toBe(true);
  });
});

describe('401 -> refresh -> retry', () => {
  it('refreshes once, stores the new token in memory and replays the request', async () => {
    setAccessToken('old');
    const seen: (string | null)[] = [];
    let refreshHeader: string | null = null;
    server.use(
      mswHttp.get(`${A}/jobs`, ({ request }) => {
        seen.push(request.headers.get('authorization'));
        return request.headers.get('authorization') === 'Bearer new' ? ok([{ id: 'j' }]) : fail(401, 'INVALID_TOKEN', 'expired');
      }),
      mswHttp.post(
        `${A}/auth/refresh`,
        ({ request }) => ((refreshHeader = request.headers.get('x-requested-with')), ok({ token: 'new', expiresIn: 900 })),
      ),
    );
    expect(await http.get('/jobs')).toEqual([{ id: 'j' }]);
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
    expect(refreshHeader).toBe('placewise-web');
    expect(getAccessToken()).toBe('new');
    expect(authLost).not.toHaveBeenCalled();
  });

  it('shares ONE refresh request between parallel 401s (single-flight)', async () => {
    setAccessToken('old');
    let refreshCalls = 0;
    server.use(
      mswHttp.get(`${A}/:thing`, ({ request, params }) =>
        request.headers.get('authorization') === 'Bearer new' ? ok({ thing: params.thing }) : fail(401, 'INVALID_TOKEN', 'expired'),
      ),
      mswHttp.post(`${A}/auth/refresh`, async () => {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 30));
        return ok({ token: 'new', expiresIn: 900 });
      }),
    );
    const results = await Promise.all([http.get('/jobs'), http.get('/candidates'), http.get('/tasks')]);
    expect(results).toEqual([{ thing: 'jobs' }, { thing: 'candidates' }, { thing: 'tasks' }]);
    expect(refreshCalls).toBe(1);
  });

  it('ends the session and surfaces the 401 when refresh is rejected', async () => {
    setAccessToken('old');
    server.use(
      mswHttp.get(`${A}/jobs`, () => fail(401, 'INVALID_TOKEN', 'expired')),
      mswHttp.post(`${A}/auth/refresh`, () => fail(401, 'INVALID_REFRESH_TOKEN', 'No refresh token')),
    );
    const err = (await http.get('/jobs').catch((e) => e)) as ApiError;
    expect(err).toMatchObject({ status: 401, code: 'INVALID_TOKEN' });
    expect(authLost).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('retries only once: a second 401 after a fresh token ends the session', async () => {
    setAccessToken('old');
    let hits = 0;
    server.use(
      mswHttp.get(`${A}/jobs`, () => (hits++, fail(401, 'INVALID_TOKEN', 'nope'))),
      mswHttp.post(`${A}/auth/refresh`, () => ok({ token: 'new', expiresIn: 900 })),
    );
    await expect(http.get('/jobs')).rejects.toMatchObject({ status: 401 });
    expect(hits).toBe(2);
    expect(authLost).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh a failed login', async () => {
    let refreshed = false;
    server.use(
      mswHttp.post(`${A}/auth/login`, () => fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password')),
      mswHttp.post(`${A}/auth/refresh`, () => ((refreshed = true), ok({ token: 'x', expiresIn: 1 }))),
    );
    await expect(http.post('/auth/login', { email: 'a@b.c', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(refreshed).toBe(false);
    expect(authLost).not.toHaveBeenCalled();
  });

  it('keeps the session when refresh fails only because the network is down', async () => {
    setAccessToken('old');
    server.use(
      mswHttp.get(`${A}/jobs`, () => fail(401, 'INVALID_TOKEN', 'expired')),
      mswHttp.post(`${A}/auth/refresh`, () => HttpResponse.error()),
    );
    await expect(http.get('/jobs')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(authLost).not.toHaveBeenCalled();
  });
});
