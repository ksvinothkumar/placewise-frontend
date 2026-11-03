import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { BlockDialog, BlockedModal } from './Blocked';

const row = { id: 'b1', email: 'asha@x.com', name: 'Asha', reason: 'Fake documents', blockedByName: 'Ria' };

vi.setConfig({ testTimeout: 30_000 });

describe('Blocked', () => {
  it('lists blocked emails with the reason and unblocks one', async () => {
    let removed = '';
    server.use(
      http.get(`${API}/blocked-candidates`, () => ok([row])),
      http.delete(`${API}/blocked-candidates/:id`, ({ params }) => {
        removed = String(params.id);
        return ok({ ok: true });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<BlockedModal onClose={() => {}} />);
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.getByText(/Fake documents/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));
    await waitFor(() => expect(removed).toBe('b1'));
  });

  it('blocks a candidate with the typed reason', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/blocked-candidates`, async ({ request }) => {
        body = await request.json();
        return ok(row);
      }),
    );
    renderWithProviders(<BlockDialog target={{ candidate: 'c1', label: 'Asha' }} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Fake documents' } });
    fireEvent.click(screen.getByRole('button', { name: /^Block$/ }));
    await waitFor(() => expect(body).toEqual({ candidate: 'c1', reason: 'Fake documents' }));
  });
});
