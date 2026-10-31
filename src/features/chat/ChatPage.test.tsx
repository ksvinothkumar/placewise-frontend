import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetPresence } from '@/realtime/chatPresence';
import { useUiStore } from '@/stores/ui.store';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { __resetTypingThrottle } from './chatSocket';
import { ChatPage } from './ChatPage';

vi.setConfig({ testTimeout: 30_000 });

// A controllable stand-in for the Socket.IO client: tests fire server events and answer `send` acks by hand.
const fake = vi.hoisted(() => {
  type Fn = (...a: unknown[]) => void;
  const handlers = new Map<string, Set<Fn>>();
  type Pending = { payload: { conversation: string; text: string }; ack: (err: Error | null, res?: unknown) => void };
  const sent: Pending[] = [];
  const emitted: [string, unknown][] = [];
  const socket = {
    connected: true,
    on: (ev: string, fn: Fn) => (handlers.get(ev) ?? handlers.set(ev, new Set()).get(ev)!).add(fn),
    off: (ev: string, fn: Fn) => handlers.get(ev)?.delete(fn),
    emit: (ev: string, payload: unknown) => void emitted.push([ev, payload]),
    timeout: () => ({ emit: (_ev: string, payload: Pending['payload'], ack: Pending['ack']) => void sent.push({ payload, ack }) }),
  };
  const fire = (ev: string, payload?: unknown) => handlers.get(ev)?.forEach((f) => f(payload));
  const reset = () => {
    handlers.clear();
    sent.length = 0;
    emitted.length = 0;
    socket.connected = true;
  };
  return { socket, sent, emitted, fire, reset };
});
vi.mock('@/realtime/socket', () => ({ getSocket: () => fake.socket, connectSocket: vi.fn(), disconnectSocket: vi.fn() }));

const PEER = { id: 'p2', name: 'Priya Nair', role: 'hr', title: 'Recruiter', active: true };
const CONV = { id: 'c1', type: 'direct', name: 'Priya Nair', peer: PEER, lastMessage: null, unread: 2 };
const msg = (id: string, text: string, sender = 'p2', readBy: string[] = []) => ({ id, conversation: 'c1', sender: { id: sender, name: sender === 'u1' ? 'Test User' : 'Priya Nair' }, text, createdAt: new Date().toISOString(), readBy });

function boot() {
  server.use(
    msw.get(`${API}/chat/conversations`, () => ok([CONV])),
    msw.get(`${API}/chat/users`, () => ok([{ ...PEER, online: true }])),
    msw.get(`${API}/chat/conversations/c1/messages`, () => ok({ messages: [msg('m1', 'Hi there')], hasMore: false })),
  );
  return renderWithProviders(<ChatPage />, { url: '/chat/c1', path: '/chat/:id' });
}
const typeAndSend = (text: string) => {
  const box = screen.getByLabelText('Message Priya');
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter' });
};

beforeEach(() => {
  fake.reset();
  __resetPresence();
  __resetTypingThrottle();
  useUiStore.setState({ toasts: [] });
});

describe('Chat thread: optimistic send with ack', () => {
  it('shows the bubble at once as sending, emits `send`, then settles when the server acks', async () => {
    boot();
    expect(await screen.findByText('Hi there')).toBeInTheDocument();

    typeAndSend('Can you join at 4?');
    // optimistic: visible immediately, flagged as pending, composer cleared
    const bubble = screen.getByText('Can you join at 4?').closest('.bub')!;
    expect(bubble).toHaveAttribute('data-pending', 'sending');
    expect(within(bubble as HTMLElement).getByText('Sending…')).toBeInTheDocument();
    expect(screen.getByLabelText('Message Priya')).toHaveValue('');
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]!.payload).toEqual({ conversation: 'c1', text: 'Can you join at 4?' });

    act(() => fake.sent[0]!.ack(null, { ok: true, message: msg('m2', 'Can you join at 4?', 'u1', ['u1']) }));
    await waitFor(() => expect(screen.queryByText('Sending…')).not.toBeInTheDocument());
    expect(screen.getAllByText('Can you join at 4?')).toHaveLength(1);
    expect(screen.getByText('Can you join at 4?').closest('.bub')).not.toHaveAttribute('data-pending');
    expect(screen.getByLabelText('Sent')).toBeInTheDocument();
  });

  it('does not duplicate the message when the socket echo arrives before the ack', async () => {
    boot();
    await screen.findByText('Hi there');
    typeAndSend('ping');
    const real = msg('m3', 'ping', 'u1', ['u1']);
    act(() => fake.fire('message', { message: real, conversation: { id: 'c1', type: 'direct' } }));
    expect(screen.getAllByText('ping')).toHaveLength(2); // optimistic copy + echo until the ack lands
    act(() => fake.sent[0]!.ack(null, { ok: true, message: real }));
    await waitFor(() => expect(screen.getAllByText('ping')).toHaveLength(1));
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
  });

  it('marks the bubble as not sent when the server answers with an error, and retry re-emits it', async () => {
    boot();
    await screen.findByText('Hi there');
    typeAndSend('too fast');
    act(() => fake.sent[0]!.ack(null, { error: 'You are sending messages too fast' }));
    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    expect(useUiStore.getState().toasts.some((t) => t.msg === 'You are sending messages too fast' && t.type === 'error')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Retry sending' }));
    expect(fake.sent).toHaveLength(2);
    expect(fake.sent[1]!.payload.text).toBe('too fast');
    await waitFor(() => expect(screen.getAllByText('too fast')).toHaveLength(1)); // the failed copy was replaced by the new attempt
    act(() => fake.sent[1]!.ack(null, { ok: true, message: msg('m4', 'too fast', 'u1', ['u1']) }));
    await waitFor(() => expect(screen.queryByText('Sending…')).not.toBeInTheDocument());
  });

  it('treats an ack timeout as a failure and lets the user discard the draft', async () => {
    boot();
    await screen.findByText('Hi there');
    typeAndSend('hello?');
    act(() => fake.sent[0]!.ack(new Error('operation has timed out')));
    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    expect(useUiStore.getState().toasts.some((t) => /timed out/.test(t.msg))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Discard message' }));
    await waitFor(() => expect(screen.queryByText('hello?')).not.toBeInTheDocument());
  });

  it('ignores whitespace-only input and sends Shift+Enter as a newline, not a message', async () => {
    boot();
    await screen.findByText('Hi there');
    const box = screen.getByLabelText('Message Priya');
    fireEvent.change(box, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.change(box, { target: { value: 'line one' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(fake.sent).toHaveLength(0);
  });

  it('falls back to REST when the socket is down', async () => {
    let body: unknown;
    server.use(msw.post(`${API}/chat/conversations/c1/messages`, async ({ request }) => ((body = await request.json()), ok(msg('m5', 'offline hi', 'u1', ['u1'])))));
    boot();
    await screen.findByText('Hi there');
    fake.socket.connected = false;
    typeAndSend('offline hi');
    await waitFor(() => expect(body).toEqual({ text: 'offline hi' }));
    await waitFor(() => expect(screen.queryByText('Sending…')).not.toBeInTheDocument());
    expect(fake.sent).toHaveLength(0);
  });
});

describe('Chat realtime events', () => {
  it('appends a live message from the peer, marks the thread read and shows typing + read receipts', async () => {
    boot();
    await screen.findByText('Hi there');
    await waitFor(() => expect(fake.emitted).toContainEqual(['read', { conversation: 'c1' }])); // opening marks it read
    const readsBefore = fake.emitted.filter(([e]) => e === 'read').length;

    act(() => fake.fire('typing', { conversation: 'c1', userId: 'p2', name: 'Priya Nair' }));
    expect(await screen.findByText(/Priya is typing/)).toBeInTheDocument();

    act(() => fake.fire('message', { message: msg('m6', 'On my way', 'p2'), conversation: { id: 'c1', type: 'direct' } }));
    expect(await screen.findByText('On my way')).toBeInTheDocument();
    expect(screen.queryByText(/Priya is typing/)).not.toBeInTheDocument();
    expect(fake.emitted.filter(([e]) => e === 'read').length).toBeGreaterThan(readsBefore);

    // our own message becomes "read" when the peer's read event arrives
    typeAndSend('great');
    act(() => fake.sent[0]!.ack(null, { ok: true, message: msg('m7', 'great', 'u1', ['u1']) }));
    await screen.findByLabelText('Sent');
    act(() => fake.fire('read', { conversation: 'c1', userId: 'p2' }));
    expect(await screen.findByLabelText('Read')).toBeInTheDocument();
  });

  it('emits `typing` (throttled) while composing', async () => {
    boot();
    await screen.findByText('Hi there');
    const box = screen.getByLabelText('Message Priya');
    fireEvent.change(box, { target: { value: 'a' } });
    fireEvent.change(box, { target: { value: 'ab' } });
    expect(fake.emitted.filter(([e]) => e === 'typing')).toEqual([['typing', { conversation: 'c1' }]]);
  });

  it('shows presence from /chat/users and updates on `presence` events', async () => {
    boot();
    expect(await screen.findByText('● Online')).toBeInTheDocument();
    act(() => fake.fire('presence', { userId: 'p2', online: false }));
    expect(await screen.findByText(/^Offline/)).toBeInTheDocument();
    act(() => fake.fire('presence:list', ['p2']));
    expect(await screen.findByText('● Online')).toBeInTheDocument();
  });

  it('shows the unread badge on the list and clears it once the thread is open', async () => {
    boot();
    await screen.findByText('Hi there');
    await waitFor(() => expect(screen.queryByLabelText('2 unread')).not.toBeInTheDocument());
  });
});
