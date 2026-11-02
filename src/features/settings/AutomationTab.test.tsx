import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { AutomationTab } from './AutomationTab';

vi.setConfig({ testTimeout: 30_000 });

const stage = (key: string, name: string, kind: string) => ({ key, name, color: '#123456', kind, prob: 0.1 });
const SETTINGS = {
  stages: [stage('sourced', 'Sourced', 'start'), stage('screening', 'Screening', 'custom'), stage('placed', 'Placed', 'placed'), stage('rejected', 'Rejected', 'rejected')],
  crmStages: [],
  contactStages: [],
  automation: { enabled: true, rules: { sourced: { tasks: [{ title: 'Call {candidate}', dueDays: 1, priority: 'High' }], email: '', moveTo: '', moveAfterDays: 0, nudgeAfterDays: 3 } } },
};

describe('AutomationTab', () => {
  it('shows the rules, only offers later non-final stages, and saves the edited rule', async () => {
    let put: unknown;
    server.use(
      msw.get(`${API}/settings`, () => ok(SETTINGS)),
      msw.put(`${API}/settings/automation`, async ({ request }) => {
        put = await request.json();
        return ok(put);
      }),
    );
    renderWithProviders(<AutomationTab />);
    expect(await screen.findByDisplayValue('Call {candidate}')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /save automation/i });
    expect(save).toBeDisabled();

    const move = screen.getByLabelText('Move on from Sourced to');
    expect(Array.from((move as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Stay here', 'Screening']);

    fireEvent.change(move, { target: { value: 'screening' } });
    fireEvent.change(screen.getByLabelText('Email for Screening'), { target: { value: 'outreach' } });
    fireEvent.click(save);
    await waitFor(() => expect(put).toBeTruthy());
    expect((put as { rules: Record<string, unknown> }).rules).toMatchObject({
      sourced: { moveTo: 'screening', nudgeAfterDays: 3 },
      screening: { email: 'outreach' },
    });
  });

  it('adds and removes a task', async () => {
    server.use(msw.get(`${API}/settings`, () => ok(SETTINGS)));
    renderWithProviders(<AutomationTab />);
    await screen.findByDisplayValue('Call {candidate}');
    fireEvent.click(screen.getAllByRole('button', { name: /add task/i })[0]!);
    expect(screen.getByLabelText('Task 2 for Sourced')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove task 2 for Sourced'));
    expect(screen.queryByLabelText('Task 2 for Sourced')).toBeNull();
  });
});
