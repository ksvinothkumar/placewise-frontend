import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { RegistrationsPage } from './RegistrationsPage';

vi.setConfig({ testTimeout: 30_000 });

const reg = { id: 'r1', kind: 'agency', plan: 'pro', workspaceName: 'Acme Staffing', workspaceSlug: 'acme-staffing', agencyName: 'Acme Pvt', contactPerson: 'Asha Rao', email: 'asha@acme.com', status: 'pending', createdAt: '2026-03-02T10:00:00Z' };

describe('RegistrationsPage', () => {
  it('lists pending registrations and approves one with the chosen role', async () => {
    const approved: unknown[] = [];
    server.use(
      msw.get(`${API}/registrations`, () => ok({ items: [reg], counts: { pending: 1, approved: 0, rejected: 0 } })),
      msw.get(`${API}/roles`, () => ok({ roles: [{ key: 'hr', name: 'HR', kind: 'staff', builtIn: true, users: 1 }, { key: 'admin', name: 'Admin', kind: 'staff', builtIn: true, users: 1 }, { key: 'client', name: 'Client', kind: 'client', builtIn: true, users: 0 }] })),
      msw.post(`${API}/registrations/r1/approve`, async ({ request }) => {
        approved.push(await request.json());
        return ok({ ...reg, status: 'approved' });
      }),
    );
    renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByText('Acme Staffing')).toBeInTheDocument();
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('asha@acme.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Approve registration')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument());
    expect(screen.queryByRole('option', { name: 'Client' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve and create login' }));
    await waitFor(() => expect(approved).toEqual([{ role: 'admin' }]));
  });
});
