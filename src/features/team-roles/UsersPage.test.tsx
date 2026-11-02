import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { UsersPage } from './UsersPage';

vi.setConfig({ testTimeout: 30_000 });

const USERS = [
  { id: 'u1', name: 'Test User', email: 't@x.io', role: 'admin', active: true, lastLoginAt: null, createdAt: '2026-07-27T10:00:00Z' },
  { id: 'u2', name: 'Priya Nair', email: 'priya@x.io', role: 'recruiter', title: 'Recruiter', active: true, totpEnabled: true, lastLoginAt: null, manager: 'u1', createdAt: '2026-09-02T10:00:00Z' },
  { id: 'u4', name: 'Kiran Das', email: 'kiran@x.io', role: 'intern', active: true, manager: 'u2', createdAt: '2026-09-03T10:00:00Z' },
];
const ROLES = { roles: [{ key: 'admin', name: 'Super Admin', kind: 'staff', builtIn: true, users: 1 }, { key: 'recruiter', name: 'Recruiter', kind: 'staff', builtIn: true, users: 1 }, { key: 'intern', name: 'Intern', kind: 'staff', builtIn: true, users: 1 }, { key: 'client', name: 'Client', kind: 'client', builtIn: true, users: 0 }] };

function boot() {
  server.use(
    msw.get(`${API}/users`, () => ok(USERS)),
    msw.get(`${API}/roles`, () => ok(ROLES)),
    msw.get(`${API}/branches`, () => ok([])),
  );
  return renderWithProviders(<UsersPage />);
}

describe('UsersPage', () => {
  it('filters the list by name, email or title', async () => {
    boot();
    await screen.findByRole('combobox', { name: 'Role for Priya Nair' });
    fireEvent.change(screen.getByLabelText('Search team'), { target: { value: 'recruiter' } });
    expect(screen.queryByRole('combobox', { name: 'Reporting manager for Test User' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Reporting manager for Priya Nair' })).toBeInTheDocument();
  });

  it('adds a member sending only the fields the API accepts, then shows the one-time password', async () => {
    let body: Record<string, unknown> = {};
    server.use(msw.post(`${API}/users`, async ({ request }) => ((body = (await request.json()) as typeof body), ok({ user: { id: 'u3', name: 'Ravi K', email: 'ravi@x.io' }, tempPassword: 'Temp#1234', email: { status: 'simulated' } }))));
    boot();
    fireEvent.click(await screen.findByRole('button', { name: /add team member/i }));
    const add = screen.getByRole('button', { name: 'Add user' });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ravi K' } });
    fireEvent.change(screen.getByLabelText('Email (sign-in)'), { target: { value: 'ravi@x.io' } });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    expect(await screen.findByTestId('temp-password')).toHaveTextContent('Temp#1234');
    expect(body).toEqual({ name: 'Ravi K', email: 'ravi@x.io', role: 'recruiter', title: '', phone: '', sendEmail: true });
    expect(screen.getByText(/Email delivery is not configured/)).toBeInTheDocument();
  });

  it('resets 2FA only after confirmation', async () => {
    let calls = 0;
    server.use(msw.post(`${API}/users/u2/reset-2fa`, () => (calls++, ok({ ok: true }))));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    boot();
    await screen.findByRole('combobox', { name: 'Role for Priya Nair' });
    const ask = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Actions for Priya Nair' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Reset two-step verification for Priya Nair' }));
    };
    await ask();
    await ask();
    await waitFor(() => expect(calls).toBe(1));
    confirmSpy.mockRestore();
  });

  it('shows each person with their role and reporting manager, and lists the roles you can give', async () => {
    boot();
    await screen.findByRole('combobox', { name: 'Role for Priya Nair' });
    expect(screen.getByRole('combobox', { name: 'Reporting manager for Priya Nair' })).toHaveValue('u1');
    expect(screen.getByRole('combobox', { name: 'Reporting manager for Test User' })).toHaveValue('');
    const role = screen.getByRole('combobox', { name: 'Role for Priya Nair' });
    expect(role).toHaveValue('recruiter');
    expect(Array.from((role as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Super Admin', 'Recruiter', 'Intern']); // staff roles only
    expect(screen.queryByRole('combobox', { name: 'Role for Test User' })).toBeNull(); // you cannot change your own role here
  });

  it('changes a role and a reporting manager inline, and never offers someone who reports to you as your manager', async () => {
    const puts: Record<string, unknown>[] = [];
    server.use(msw.put(`${API}/users/u2`, async ({ request }) => (puts.push((await request.json()) as Record<string, unknown>), ok({ ...USERS[1] }))));
    boot();
    await screen.findByRole('combobox', { name: 'Role for Priya Nair' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for Priya Nair' }), { target: { value: 'intern' } });
    await waitFor(() => expect(puts).toEqual([{ role: 'intern' }]));
    fireEvent.change(screen.getByRole('combobox', { name: 'Reporting manager for Priya Nair' }), { target: { value: '' } });
    await waitFor(() => expect(puts.at(-1)).toEqual({ manager: '' })); // '' clears it
    // Kiran reports to Priya, so Priya's list must not offer Kiran (that would be a loop)
    const names = Array.from((screen.getByRole('combobox', { name: 'Reporting manager for Priya Nair' }) as HTMLSelectElement).options).map((o) => o.text);
    expect(names).toEqual(['No manager', 'Test User']);
  });
});

