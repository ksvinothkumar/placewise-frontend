import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/stores/ui.store';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { RolesPage } from './RolesPage';

vi.setConfig({ testTimeout: 30_000 });

const VIEW = {
  catalog: [
    { module: 'Jobs', perms: [['jobs:view', 'View jobs'], ['jobs:write', 'Edit jobs']] },
    { module: 'Clients', perms: [['clients:view', 'View clients'], ['clients:write', 'Edit clients']] },
  ],
  roles: [
    { key: 'admin', name: 'Admin', kind: 'staff', builtIn: true, users: 1, permissions: ['*'] },
    { key: 'hr', name: 'HR', kind: 'staff', builtIn: true, description: 'Recruiters', users: 3, permissions: ['jobs:view'] },
    { key: 'client', name: 'Client', kind: 'client', builtIn: true, users: 2, permissions: [] },
  ],
};
const boot = () => {
  server.use(msw.get(`${API}/roles`, () => ok(VIEW)), msw.get(`${API}/auth/me`, () => ok({ user: { id: 'u1', name: 'T', email: 't@x.io', role: 'admin' }, permissions: ['*'] })));
  return renderWithProviders(<RolesPage />);
};

describe('RolesPage permission matrix', () => {
  it('toggles permissions, counts them, and saves the full permission set for the role', async () => {
    let put: { key?: string; body?: unknown } = {};
    server.use(msw.put(`${API}/roles/:key`, async ({ request, params }) => ((put = { key: String(params.key), body: await request.json() }), ok({ ...VIEW.roles[1] }))));
    boot();
    const viewJobs = await screen.findByRole('checkbox', { name: 'View jobs' });
    expect(viewJobs).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Edit jobs' })).not.toBeChecked();
    expect(screen.getByText('1 permission selected')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Edit jobs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select all Clients permissions' }));
    expect(screen.getByText('4 permissions selected')).toBeInTheDocument();
    expect(save).toBeEnabled();

    fireEvent.click(save);
    await waitFor(() => expect(put.key).toBe('hr'));
    expect((put.body as { permissions: string[] }).permissions.sort()).toEqual(['clients:view', 'clients:write', 'jobs:view', 'jobs:write']);
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => /Permissions saved/.test(t.msg))).toBe(true));
  });

  it('discarding a draft restores the stored permissions', async () => {
    boot();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Edit jobs' }));
    expect(screen.getByText('2 permissions selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByText('1 permission selected')).toBeInTheDocument();
  });

  it('locks the admin role: every box disabled and no save bar', async () => {
    boot();
    fireEvent.click(await screen.findByRole('option', { name: /Admin/ }));
    expect(await screen.findByText(/Admin always has full access/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'View jobs' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('creates a role from an existing one', async () => {
    let body: unknown;
    server.use(msw.post(`${API}/roles`, async ({ request }) => ((body = await request.json()), ok({ ...VIEW.roles[1], key: 'senior', name: 'Senior' }))));
    boot();
    await screen.findByRole('checkbox', { name: 'View jobs' });
    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    const create = screen.getByRole('button', { name: 'Create role' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Senior' } });
    fireEvent.click(create);
    await waitFor(() => expect(body).toEqual({ name: 'Senior', copyFrom: 'hr' }));
  });

  it('closes the new-role dialog with Escape', async () => {
    boot();
    await screen.findByRole('checkbox', { name: 'View jobs' });
    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
