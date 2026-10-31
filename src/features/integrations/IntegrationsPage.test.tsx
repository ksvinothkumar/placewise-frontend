import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { IntegrationsPage } from './IntegrationsPage';

vi.setConfig({ testTimeout: 30_000 });

const HOOK = { id: 'w1', name: 'Zapier', url: 'https://hooks.example.com/a', events: ['candidate.created'], active: true, last: { ok: true } };
afterEach(() => vi.restoreAllMocks());

function boot(items = [HOOK]) {
  server.use(
    msw.get(`${API}/integrations`, () => ok({ email: { configured: true, from: 'hr@x.io', host: 'smtp.x.io' }, ai: { enabled: false }, careers: { published: 2 } })),
    msw.get(`${API}/webhooks`, () => ok({ items, events: ['candidate.created', 'placement.made'] })),
  );
  return renderWithProviders(<IntegrationsPage />);
}

describe('IntegrationsPage webhooks', () => {
  it('creates a webhook, then shows the signing secret exactly once', async () => {
    let body: unknown;
    server.use(msw.post(`${API}/webhooks`, async ({ request }) => ((body = await request.json()), ok({ ...HOOK, id: 'w2', name: 'Slack', secret: 'whsec_abc123' }))));
    boot([]);
    expect(await screen.findByText(/No webhooks yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new webhook/i }));

    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Slack' } });
    fireEvent.change(screen.getByLabelText('URL (https)'), { target: { value: 'https://hooks.slack.com/x' } });
    expect(create).toBeDisabled(); // an event is required
    fireEvent.click(screen.getByRole('checkbox', { name: 'placement.made' }));
    expect(create).toBeEnabled();
    fireEvent.click(create);

    expect(await screen.findByTestId('webhook-secret')).toHaveTextContent('whsec_abc123');
    expect(body).toEqual({ name: 'Slack', url: 'https://hooks.slack.com/x', events: ['placement.made'] });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('webhook-secret')).not.toBeInTheDocument();
  });

  it('rotates the secret only after confirmation and displays the new one', async () => {
    let rotated = 0;
    server.use(msw.post(`${API}/webhooks/w1/rotate-secret`, () => (rotated++, ok({ secret: 'whsec_new' }))));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    boot();
    const btn = await screen.findByRole('button', { name: 'New secret for Zapier' });

    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 30));
    expect(rotated).toBe(0);
    expect(screen.queryByTestId('webhook-secret')).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(await screen.findByTestId('webhook-secret')).toHaveTextContent('whsec_new');
    expect(rotated).toBe(1);
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it('pauses a webhook and reports a test delivery', async () => {
    let put: unknown;
    server.use(
      msw.put(`${API}/webhooks/w1`, async ({ request }) => ((put = await request.json()), ok({ ...HOOK, active: false }))),
      msw.post(`${API}/webhooks/w1/test`, () => ok({ ok: false, error: 'connect ECONNREFUSED' })),
    );
    boot();
    fireEvent.click(await screen.findByRole('button', { name: 'Pause Zapier' }));
    await waitFor(() => expect(put).toEqual({ active: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Send test to Zapier' }));
    const { useUiStore } = await import('@/stores/ui.store');
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.msg === 'Failed: connect ECONNREFUSED' && t.type === 'error')).toBe(true));
  });

  it('lists deliveries in a dialog that closes with Escape', async () => {
    server.use(msw.get(`${API}/webhooks/w1/deliveries`, () => ok([{ id: 'd1', event: 'candidate.created', ok: false, error: 'HTTP 500', attempt: 2, durationMs: 120, createdAt: '2026-01-02T10:00:00Z' }])));
    boot();
    fireEvent.click(await screen.findByRole('button', { name: 'Deliveries for Zapier' }));
    const dlg = await screen.findByRole('dialog');
    expect(await within(dlg).findByText(/HTTP 500 · retry/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows email status and sends a test email', async () => {
    server.use(msw.post(`${API}/integrations/test-email`, () => ok({ status: 'sent', to: 'me@x.io' })));
    boot();
    expect(await screen.findByText('Sending from hr@x.io via smtp.x.io.')).toBeInTheDocument();
    expect(screen.getByText('2 live')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send test email/i }));
    const { useUiStore } = await import('@/stores/ui.store');
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.msg === 'Test email sent to me@x.io')).toBe(true));
  });
});
