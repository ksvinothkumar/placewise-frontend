import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { InterviewsPage } from './InterviewsPage';

vi.setConfig({ testTimeout: 30_000 });

const at = new Date();
at.setHours(15, 0, 0, 0);
const IV = {
  id: 'iv1',
  when: at.toISOString(),
  duration: 45,
  mode: 'Video',
  round: 'Technical Round 1',
  interviewer: 'Priya',
  location: 'https://meet.example.com/x',
  inviteStatus: 'sent',
  application: { id: 'a1', candidate: { id: 'c1', name: 'Asha Rao', email: 'asha@x.io' }, job: { title: 'Backend Engineer', client: { name: 'Acme' } } },
};

describe('InterviewsPage', () => {
  it('shows the interview on the calendar, opens its drawer, and saves a scorecard with the rated criteria', async () => {
    const saved: unknown[] = [];
    server.use(
      msw.get(`${API}/interviews`, () => ok([IV])),
      msw.get(`${API}/interviews/iv1/scorecards`, () => ok([])),
      msw.post(`${API}/interviews/iv1/scorecard`, async ({ request }) => {
        saved.push(await request.json());
        return ok({ id: 's1' });
      }),
    );
    renderWithProviders(<InterviewsPage />);
    fireEvent.click(await screen.findByTitle('Asha Rao · Backend Engineer'));
    expect(await screen.findByText('Open meeting link')).toHaveAttribute('href', 'https://meet.example.com/x');
    expect(screen.getByText('Invite sent')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Add my feedback/ }));
    fireEvent.click(screen.getAllByRole('button', { name: '4 stars' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Strong yes' }));
    fireEvent.change(screen.getByPlaceholderText(/Strengths, concerns/), { target: { value: 'Solid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback' }));
    await waitFor(() => expect(saved).toEqual([{ ratings: { technical: 4 }, recommendation: 'strong_yes', comments: 'Solid' }]));
  });

  it('counts today and pending invites in the KPI strip', async () => {
    server.use(msw.get(`${API}/interviews`, () => ok([IV, { ...IV, id: 'iv2', inviteStatus: null }])));
    renderWithProviders(<InterviewsPage />);
    const kpi = async (label: string) => (await screen.findAllByText(label))[0]!.parentElement as HTMLElement;
    await waitFor(async () => expect(await kpi('Today')).toHaveTextContent('2'));
    expect(await kpi('Invite pending')).toHaveTextContent('1');
  });
});
