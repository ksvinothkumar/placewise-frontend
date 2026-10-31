import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';

export const API = 'http://localhost:4100/api/v1';
export const ok = <T,>(data: T) => HttpResponse.json({ data, meta: { requestId: 'r1' } });
export const fail = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message, requestId: 'req-1' } }, { status });

/** Render with React Query + a memory router; `path` is the route pattern, `url` the location. */
export function renderWithProviders(ui: ReactElement, { url = '/', path = '*', permissions = ['*'] }: { url?: string; path?: string; permissions?: string[] } = {}) {
  useSessionStore.setState({ permissions, status: 'authed', user: { id: 'u1', name: 'Test User', email: 't@x.io', role: 'admin' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
