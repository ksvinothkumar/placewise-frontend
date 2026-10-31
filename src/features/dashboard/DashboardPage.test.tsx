import { screen, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { DashboardPage } from './DashboardPage';

vi.setConfig({ testTimeout: 30_000 });

const DATA = {
  kpis: { openJobs: 7, openings: 12, activePipeline: 31, candidates: 240, placements: 5, billed: 18.5, forecast: 9.25, avgTimeToFill: 34 },
  funnel: [
    { stage: 'Sourced', count: 40 },
    { stage: 'Interview', count: 12 },
  ],
  sources: [
    { name: 'LinkedIn', value: 3 },
    { name: 'Referral', value: 2 },
  ],
  atRisk: [{ id: 'j9', title: 'Data Engineer', client: 'Globex', days: 41, live: 2, advanced: 0, risk: 4 }],
  interviews: [{ id: 'iv1', when: '2026-11-02T10:00:00Z', round: 'Technical', mode: 'Video', interviewer: 'Priya', application: { candidate: { name: 'Ravi K' } } }],
  tasks: { open: 3, overdue: 1, today: 1, next: [{ id: 't1', title: 'Send proposal', due: '2026-11-01T09:00:00Z', candidate: null }] },
  activity: [{ id: 'a1', text: 'Asha placed at Acme', kind: 'placed', createdAt: new Date().toISOString() }],
};

describe('DashboardPage', () => {
  it('renders KPI tiles with money formatting, funnel, sources total and lists', async () => {
    server.use(msw.get(`${API}/dashboard`, () => ok(DATA)));
    renderWithProviders(<DashboardPage />);
    const tile = async (label: string) => (await screen.findByText(label, { selector: '.l' })).closest('.kpi') as HTMLElement;
    expect(await tile('Open jobs')).toHaveTextContent('7');
    expect(await tile('Open jobs')).toHaveTextContent('12 openings');
    expect(await tile('Active pipeline')).toHaveTextContent('31');
    expect(await tile('Active pipeline')).toHaveTextContent('240 in talent pool');
    expect(await tile('Placements')).toHaveTextContent('Billed ₹18.5L');
    expect(await tile('Weighted forecast')).toHaveTextContent('₹9.3L');
    expect(await tile('Avg time-to-fill')).toHaveTextContent('34d');
    // funnel bars are buttons, sources total sits in the donut
    expect(screen.getByRole('button', { name: 'Sourced: 40' })).toBeInTheDocument();
    expect(screen.getByText('candidates').previousSibling).toHaveTextContent('5');
    expect(screen.getByText('Data Engineer')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Ravi K')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(within(screen.getByText('My tasks').closest('.card') as HTMLElement).getByText('Send proposal')).toBeInTheDocument();
    expect(screen.getByText('Asha placed at Acme')).toBeInTheDocument();
  });

  it('omits the forecast tile when the API hides finance fields', async () => {
    const { forecast: _f, billed: _b, ...kpis } = DATA.kpis;
    server.use(msw.get(`${API}/dashboard`, () => ok({ ...DATA, kpis, tasks: undefined })));
    renderWithProviders(<DashboardPage />);
    const placements = (await screen.findByText('Placements', { selector: '.l' })).closest('.kpi');
    expect(placements).toHaveTextContent('Completed placements');
    expect(screen.queryByText('Weighted forecast')).not.toBeInTheDocument();
    expect(screen.queryByText('My tasks')).not.toBeInTheDocument();
  });
});
