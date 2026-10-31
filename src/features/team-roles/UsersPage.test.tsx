import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { UsersPage } from './UsersPage';

vi.setConfig({ testTimeout: 30_000 });

const USERS = [
  { id: 'u1', name: 'Test User', email: 't@x.io', role: 'admin', active: true, lastLoginAt: null },
  { id: 'u2', name: 'Priya Nair', email: 'priya@x.io', role: 'hr', title: 'Recruiter', active: true, totpEnabled: true, lastLoginAt: null },
];
const ROLES = { roles: [{ key: 'admin', name: 'Admin', kind: 'staff', builtIn: true, users: 1 }, { key: 'hr', name: 'HR', kind: 'staff', builtIn: true, users: 1 }] };

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
    expect(await screen.findByText('Priya Nair')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search team'), { target: { value: 'recruiter' } });
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
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
    expect(body).toEqual({ name: 'Ravi K', email: 'ravi@x.io', role: 'hr', title: '', phone: '', sendEmail: true });
    expect(screen.getByText(/Email delivery is not configured/)).toBeInTheDocument();
  });

  it('resets 2FA only after confirmation', async () => {
    let calls = 0;
    server.use(msw.post(`${API}/users/u2/reset-2fa`, () => (calls++, ok({ ok: true }))));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    boot();
    const btn = await screen.findByRole('button', { name: 'Reset two-step verification for Priya Nair' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(calls).toBe(1));
    confirmSpy.mockRestore();
  });
});
