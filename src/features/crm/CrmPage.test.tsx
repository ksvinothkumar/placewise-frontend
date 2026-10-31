import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/stores/ui.store';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { CompanyDetailPage } from './CompanyDetailPage';
import { CrmPage } from './CrmPage';

vi.setConfig({ testTimeout: 30_000 });

const SETTINGS = {
  stages: [],
  crmStages: [
    { key: 'lead', name: 'Lead', color: '#94a3b8', kind: 'open' },
    { key: 'meeting', name: 'Meeting', color: '#0ea5e9', kind: 'open' },
    { key: 'won', name: 'Won', color: '#10b981', kind: 'won' },
  ],
  contactStages: [
    { key: 'new', name: 'New', color: '#94a3b8', kind: 'open' },
    { key: 'engaged', name: 'Engaged', color: '#0ea5e9', kind: 'open' },
  ],
};
const COMPANY = { id: 'co1', name: 'Globex', industry: 'Retail', city: 'Pune', stage: 'Lead', dealValue: 12, owner: { id: 'u1', name: 'Test User' }, contacts: 1, nextFollowUp: null };

beforeEach(() => {
  useUiStore.setState({ toasts: [] });
  server.use(
    msw.get(`${API}/settings`, () => ok(SETTINGS)),
    msw.get(`${API}/chat/users`, () => ok([{ id: 'u1', name: 'Test User' }])),
  );
});

describe('CRM stage changes', () => {
  it('company detail: choosing a stage PATCHes /crm/companies/:id/stage', async () => {
    const bodies: unknown[] = [];
    server.use(
      msw.get(`${API}/crm/companies/co1`, () => ok({ ...COMPANY, contactList: [] })),
      msw.get(`${API}/notes`, () => ok([])),
      msw.patch(`${API}/crm/companies/co1/stage`, async ({ request }) => {
        bodies.push(await request.json());
        return ok({ ...COMPANY, stage: 'Meeting' });
      }),
    );
    renderWithProviders(<CompanyDetailPage />, { url: '/crm/companies/co1', path: '/crm/companies/:id' });
    const select = await screen.findByLabelText('Stage');
    await within(select).findByRole('option', { name: 'Meeting' });
    fireEvent.change(select, { target: { value: 'Meeting' } });
    await waitFor(() => expect(bodies).toEqual([{ stage: 'Meeting' }]));
    expect(useUiStore.getState().toasts.map((t) => t.msg)).toContain('Moved to Meeting');
  });

  it('board: keyboard-moving a card sends the new stage and rolls back with the server message on error', async () => {
    const bodies: unknown[] = [];
    server.use(
      msw.get(`${API}/crm/summary`, () => ok({ open: 1, pipelineValue: 12, overdue: 0, today: 0, wonThisMonth: 0 })),
      msw.get(`${API}/crm/companies`, () => ok([COMPANY])),
      msw.get(`${API}/crm/contacts`, () => ok([])),
      msw.patch(`${API}/crm/companies/co1/stage`, async ({ request }) => {
        bodies.push(await request.json());
        return fail(403, 'FORBIDDEN', 'No permission');
      }),
    );
    renderWithProviders(<CrmPage />);
    const card = await screen.findByRole('button', { name: 'Globex, Lead' });
    expect(within(screen.getByRole('group', { name: 'Lead' })).getByText('Globex')).toBeInTheDocument();
    fireEvent.keyDown(card, { key: 'ArrowRight', altKey: true });
    await waitFor(() => expect(bodies).toEqual([{ stage: 'Meeting' }]));
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Lead' })).getByText('Globex')).toBeInTheDocument());
    expect(useUiStore.getState().toasts.some((t) => t.type === 'error' && t.msg === 'No permission')).toBe(true);
  });

  it('contacts tab: stage select is disabled without crm:write', async () => {
    server.use(
      msw.get(`${API}/crm/summary`, () => ok({ open: 0, pipelineValue: 0, overdue: 0, today: 0, wonThisMonth: 0 })),
      msw.get(`${API}/crm/companies`, () => ok([])),
      msw.get(`${API}/crm/contacts`, () => ok([{ id: 'ct1', name: 'Meera S', stage: 'New', company: { id: 'co1', name: 'Globex' }, owner: { id: 'u1', name: 'Test User' } }])),
    );
    renderWithProviders(<CrmPage />, { permissions: ['crm:view'] });
    fireEvent.click(await screen.findByRole('button', { name: /Contacts/ }));
    expect(await screen.findByLabelText('Stage for Meera S')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /New contact/ })).not.toBeInTheDocument();
  });
});
