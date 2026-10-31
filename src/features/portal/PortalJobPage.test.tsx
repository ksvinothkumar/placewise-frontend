import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { PortalJobPage } from './PortalJobPage';

vi.setConfig({ testTimeout: 30_000 });

describe('PortalJobPage', () => {
  it('sends client feedback with the chosen decision and comment', async () => {
    const bodies: unknown[] = [];
    server.use(
      msw.get(`${API}/portal/jobs/j1`, () =>
        ok({
          job: { id: 'j1', title: 'Backend Engineer', city: 'Pune', openings: 2, skills: ['node'], expMin: 3, expMax: 6 },
          shortlist: [{ applicationId: 'ap1', stage: 'Submitted', candidate: { id: 'c1', name: 'Asha Rao', exp: 5, expected: 22, notice: 30, skills: ['node'], score: 82 }, feedback: null, interviews: [] }],
        }),
      ),
      msw.post(`${API}/portal/applications/ap1/feedback`, async ({ request }) => {
        bodies.push(await request.json());
        return ok({ ok: true });
      }),
    );
    renderWithProviders(<PortalJobPage />, { url: '/portal/jobs/j1', path: '/portal/jobs/:id', permissions: [] });
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Expects ₹22L')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Interested/ }));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Call this week' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(bodies).toEqual([{ decision: 'interested', comment: 'Call this week' }]));
  });
});
