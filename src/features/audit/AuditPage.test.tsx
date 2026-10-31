import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { AuditPage } from './AuditPage';

vi.setConfig({ testTimeout: 30_000 });

const row = (id: string, userName: string, status = 200) => ({ id, createdAt: '2026-03-02T10:00:00Z', userName, role: 'admin', action: 'PUT', entity: 'jobs', path: '/jobs/1', status });

describe('AuditPage', () => {
  it('lists events, filters server-side with a debounced query, and pages', async () => {
    const queries: string[] = [];
    server.use(
      msw.get(`${API}/audit`, ({ request }) => {
        const u = new URL(request.url);
        queries.push(u.search);
        const q = u.searchParams.get('q');
        return ok({ items: [row(q ? 'a2' : 'a1', q ? 'Priya' : 'Asha', q ? 500 : 200)], total: 42, page: Number(u.searchParams.get('page') ?? 1), pages: 3, entities: ['jobs', 'users'] });
      }),
    );
    renderWithProviders(<AuditPage />);
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('42 events')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search audit log'), { target: { value: 'pri' } });
    expect(queries).toHaveLength(1); // not yet: typing is debounced
    expect(await screen.findByText('Priya')).toBeInTheDocument();
    expect(queries.at(-1)).toContain('q=pri');
    expect(screen.getByText('500').className).toContain('bad');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(queries.at(-1)).toContain('page=2'));
  });
});
