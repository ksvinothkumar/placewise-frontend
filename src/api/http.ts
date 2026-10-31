import { ApiError } from './errors';

/** `data` plus the envelope `meta` (requestId, paging). Most callers only need `data`; see `http.raw`. */
export interface Envelope<T> {
  data: T;
  meta: { requestId?: string; page?: number; pageSize?: number; total?: number; [k: string]: unknown };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** multipart upload; mutually exclusive with `body` */
  form?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** do not attempt refresh on 401 (set automatically for /auth/* credential calls) */
  skipRefresh?: boolean;
}

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const API_BASE = `${API_URL}/api/v1`;
export const WS_URL = (import.meta.env.VITE_WS_URL ?? API_URL) || undefined;

// ---- access token: memory only. Never localStorage/sessionStorage; the refresh cookie (httpOnly) restores it on reload. ----
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

/** Called when a refresh fails: the session is gone. The session store registers a handler that clears state. */
let onAuthLost: () => void = () => {};
export const setAuthLostHandler = (fn: () => void) => {
  onAuthLost = fn;
};

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const url = API_BASE + path;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${url}${url.includes('?') ? '&' : '?'}${s}` : url;
};

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body,
      credentials: 'include',
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Cannot reach the server. Check your connection and try again.' });
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page (proxy, gateway) */
  }
  const err = (body as { error?: { code?: string; message?: string; details?: unknown; requestId?: string } } | undefined)?.error;
  return new ApiError({
    status: res.status,
    code: err?.code ?? `HTTP_${res.status}`,
    message: err?.message ?? (res.status >= 500 ? 'Something went wrong on our side' : res.statusText || 'Request failed'),
    details: err?.details,
    requestId: err?.requestId,
  });
}

// ---- refresh: one in-flight promise shared by every caller (parallel 401s and the boot sequence) ----
let refreshing: Promise<string> | null = null;

/** Exchange the httpOnly refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= (async () => {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'X-Requested-With': 'placewise-web', 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
      credentials: 'include',
    }).catch(() => {
      throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Cannot reach the server.' });
    });
    if (!res.ok) throw await toApiError(res);
    const json = (await res.json()) as Envelope<{ token: string; expiresIn: number }>;
    accessToken = json.data.token;
    return json.data.token;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function execute(path: string, opts: RequestOptions): Promise<Response> {
  const res = await send(path, opts, accessToken);
  if (res.status !== 401 || opts.skipRefresh || NO_REFRESH.some((p) => path.startsWith(p))) return res;

  let fresh: string;
  try {
    fresh = await refreshAccessToken();
  } catch (e) {
    // Only a definitive auth failure ends the session; a network blip on refresh just surfaces as an error.
    if (e instanceof ApiError && e.status !== 0) {
      accessToken = null;
      onAuthLost();
    }
    throw e instanceof ApiError && e.status !== 0 ? await toApiError(res) : e;
  }
  const retry = await send(path, opts, fresh);
  if (retry.status === 401) {
    // second 401 with a brand-new token: nothing more to try
    accessToken = null;
    onAuthLost();
  }
  return retry;
}

async function raw<T>(path: string, opts: RequestOptions = {}): Promise<Envelope<T>> {
  const res = await execute(path, opts);
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return { data: undefined as T, meta: {} };
  const text = await res.text();
  if (!text) return { data: undefined as T, meta: {} };
  const json = JSON.parse(text) as Partial<Envelope<T>>;
  if (json && typeof json === 'object' && 'data' in json) return { data: json.data as T, meta: json.meta ?? {} };
  return { data: json as T, meta: {} }; // un-enveloped body (should not happen on /api/v1)
}

const call = async <T>(path: string, opts?: RequestOptions) => (await raw<T>(path, opts)).data;

export const http = {
  raw,
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) => call<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => call<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => call<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => call<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => call<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST') => call<T>(path, { method, form }),
  /** authenticated binary fetch (photos, PDFs); returns an object URL the caller should revoke when done */
  async blobUrl(path: string): Promise<string> {
    const res = await execute(path, {});
    if (!res.ok) throw await toApiError(res);
    return URL.createObjectURL(await res.blob());
  },
  /** authenticated binary fetch returning the Blob (downloads) */
  async blob(path: string): Promise<Blob> {
    const res = await execute(path, {});
    if (!res.ok) throw await toApiError(res);
    return res.blob();
  },
};
