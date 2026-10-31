import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { TasksPage } from './TasksPage';

vi.setConfig({ testTimeout: 30_000 });

const TASK = { id: 't1', title: 'Call Asha back', done: false, overdue: true, priority: 'High', due: '2026-10-01T10:00:00Z', candidate: { id: 'c1', name: 'Asha Rao' } };

describe('TasksPage', () => {
  it('groups tasks and toggles completion with PUT /tasks/:id {done}', async () => {
    const puts: unknown[] = [];
    const urls: string[] = [];
    server.use(
      msw.get(`${API}/tasks`, ({ request }) => {
        urls.push(new URL(request.url).search);
        return ok([TASK]);
      }),
      msw.put(`${API}/tasks/t1`, async ({ request }) => {
        puts.push(await request.json());
        return ok({ ...TASK, done: true });
      }),
    );
    renderWithProviders(<TasksPage />);
    expect(await screen.findByText('Call Asha back')).toBeInTheDocument();
    expect(screen.getByText('Overdue · 1')).toBeInTheDocument();
    expect(urls[0]).toContain('status=open');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete Call Asha back' }));
    await waitFor(() => expect(puts).toEqual([{ done: true }]));
    // the list is refetched after the toggle
    await waitFor(() => expect(urls.length).toBeGreaterThan(1));
  });

  it('switches to the Done tab and asks the API for completed tasks', async () => {
    const urls: string[] = [];
    server.use(
      msw.get(`${API}/tasks`, ({ request }) => {
        urls.push(new URL(request.url).search);
        return ok([]);
      }),
    );
    renderWithProviders(<TasksPage />);
    await screen.findByText('Nothing to do');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('No completed tasks yet')).toBeInTheDocument();
    expect(urls.at(-1)).toContain('status=done');
  });
});
