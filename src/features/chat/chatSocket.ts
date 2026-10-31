import { chatApi, type ChatMessage } from '@/api/endpoints/chat';
import { getSocket } from '@/realtime/socket';

type Ack = { ok?: true; message?: ChatMessage; error?: string };

const ACK_TIMEOUT_MS = 8000;

/** Send over the socket and wait for the server ack; falls back to REST while disconnected. */
export function sendMessage(conversation: string, text: string): Promise<ChatMessage> {
  const s = getSocket();
  if (!s.connected) return chatApi.send(conversation, text);
  return new Promise((resolve, reject) => {
    s.timeout(ACK_TIMEOUT_MS).emit('send', { conversation, text }, (err: Error | null, res?: Ack) => {
      if (err) reject(new Error('Message timed out. Please try again.'));
      else if (res?.error || !res?.message) reject(new Error(res?.error ?? 'Could not send the message'));
      else resolve(res.message);
    });
  });
}

let lastTyping = 0;
/** At most one `typing` event per ~1.8 s. */
export function sendTyping(conversation: string) {
  const now = Date.now();
  if (now - lastTyping < 1800) return;
  lastTyping = now;
  getSocket().emit('typing', { conversation });
}

export function emitRead(conversation: string): Promise<unknown> | void {
  const s = getSocket();
  if (s.connected) s.emit('read', { conversation });
  else return chatApi.read(conversation).catch(() => undefined);
}

/** test helper */
export const __resetTypingThrottle = () => {
  lastTyping = 0;
};
