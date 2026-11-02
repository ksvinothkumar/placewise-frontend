import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { NotesPage } from './NotesPage';

vi.setConfig({ testTimeout: 30_000 });

const note = (o: object = {}) => ({ id: 'n1', title: 'Hiring plan', body: 'Open 3 roles', color: 'yellow', pinned: false, owner: { id: 'u1', name: 'Asha' }, mine: true, canEdit: true, team: 'none', sharedCount: 0, shares: [], updatedAt: '2026-03-02T10:00:00Z', ...o });

describe('NotesPage', () => {
  it('shows notes, filters by tab and search, and creates a new note', async () => {
    const queries: string[] = [];
    const created: unknown[] = [];
    server.use(
      msw.get(`${API}/notebook`, ({ request }) => {
        queries.push(new URL(request.url).search);
        return ok([note(), note({ id: 'n2', title: 'From Ravi', body: 'FYI', mine: false, owner: { id: 'u2', name: 'Ravi' }, canEdit: false, sharedCount: 1 })]);
      }),
      msw.post(`${API}/notebook`, async ({ request }) => {
        created.push(await request.json());
        return ok(note({ id: 'n3' }));
      }),
    );
    renderWithProviders(<NotesPage />);
    expect(await screen.findByText('Hiring plan')).toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Shared with me' }));
    await waitFor(() => expect(queries.at(-1)).toContain('scope=shared'));
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'plan' } });
    await waitFor(() => expect(queries.at(-1)).toContain('q=plan'));

    fireEvent.click(screen.getByRole('button', { name: /New note/ }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Idea' } });
    fireEvent.click(screen.getByRole('radio', { name: 'blue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(created).toEqual([{ title: 'Idea', body: '', color: 'blue' }]));
  });

  it('opens a view-only note read-only, and lets the owner share it with a person', async () => {
    const shared: unknown[] = [];
    server.use(
      msw.get(`${API}/notebook`, () => ok([note({ id: 'n2', title: 'From Ravi', mine: false, owner: { id: 'u2', name: 'Ravi' }, canEdit: false, sharedCount: 1 }), note()])),
      msw.get(`${API}/chat/users`, () => ok([{ id: 'u1', name: 'Asha' }, { id: 'u3', name: 'Meena', title: 'Recruiter' }])),
      msw.put(`${API}/notebook/n1/share`, async ({ request }) => {
        shared.push(await request.json());
        return ok(note());
      }),
    );
    renderWithProviders(<NotesPage />);
    fireEvent.click(await screen.findByText('From Ravi'));
    expect(await screen.findByText(/Shared by Ravi · view only/)).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);

    fireEvent.click(screen.getAllByText('Hiring plan')[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Meena' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Meena can' }), { target: { value: 'edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save sharing' }));
    await waitFor(() => expect(shared).toEqual([{ team: 'none', users: [{ id: 'u3', canEdit: true }] }]));
    expect(screen.queryByRole('checkbox', { name: 'Asha' })).toBeNull(); // the owner is not offered
  });
});
