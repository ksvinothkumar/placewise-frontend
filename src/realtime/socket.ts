import { io, type Socket } from 'socket.io-client';
import { getAccessToken, refreshAccessToken, WS_URL } from '@/api/http';

let socket: Socket | null = null;

/** Lazily created singleton (not connected until connectSocket). The auth callback re-reads the in-memory token on every (re)connect. */
export function getSocket(): Socket {
  socket ??= io(WS_URL, {
    path: '/ws',
    autoConnect: false,
    withCredentials: true,
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.hasListeners('connect_error')) {
    // An expired access token is rejected at the handshake; refresh once and let socket.io's own reconnect pick up the new token.
    s.on('connect_error', (err) => {
      if (/auth|token|unauthor/i.test(err.message)) void refreshAccessToken().catch(() => s.disconnect());
    });
  }
  if (!s.connected) s.connect();
}

export function disconnectSocket() {
  socket?.disconnect();
}
