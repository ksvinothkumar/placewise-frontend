import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { ChatConversation, ChatMessage, MessagePage } from '@/api/endpoints/chat';
import { queryKeys } from '@/api/queryKeys';

/** A message in the thread. `pending` marks optimistic ones that have not been acked (or failed). */
export type ThreadMessage = ChatMessage & { pending?: 'sending' | 'failed' };
export type ThreadData = InfiniteData<Omit<MessagePage, 'messages'> & { messages: ThreadMessage[] }, string | undefined>;

export const messagesKey = (conversation: string) => ['chat', 'messages', conversation] as const;

/** Oldest-first list across pages (page 0 is the newest batch). */
export const flatten = (d: ThreadData | undefined): ThreadMessage[] => (d ? [...d.pages].reverse().flatMap((p) => p.messages) : []);

const edit = (qc: QueryClient, conv: string, fn: (msgs: ThreadMessage[]) => ThreadMessage[]) =>
  qc.setQueryData<ThreadData>(messagesKey(conv), (d) => {
    if (!d || !d.pages.length) return d;
    const [first, ...rest] = d.pages;
    return { ...d, pages: [{ ...first!, messages: fn(first!.messages) }, ...rest] };
  });

const has = (d: ThreadData | undefined, id: string) => !!d?.pages.some((p) => p.messages.some((m) => m.id === id));

/** Live or optimistic message; ignored when it is already there (socket echo + ack both deliver the same message). */
export function appendMessage(qc: QueryClient, m: ThreadMessage) {
  if (has(qc.getQueryData<ThreadData>(messagesKey(m.conversation)), m.id)) return;
  edit(qc, m.conversation, (msgs) => [...msgs, m]);
}

/** Swap an optimistic message for the server's. If the socket echo already delivered it, just drop the optimistic copy. */
export function resolveMessage(qc: QueryClient, conv: string, tmpId: string, real: ChatMessage) {
  const exists = has(qc.getQueryData<ThreadData>(messagesKey(conv)), real.id);
  qc.setQueryData<ThreadData>(messagesKey(conv), (d) =>
    d && { ...d, pages: d.pages.map((p) => ({ ...p, messages: exists ? p.messages.filter((m) => m.id !== tmpId) : p.messages.map((m) => (m.id === tmpId ? real : m)) })) },
  );
}

export function patchMessage(qc: QueryClient, conv: string, id: string, patch: Partial<ThreadMessage>) {
  qc.setQueryData<ThreadData>(messagesKey(conv), (d) => d && { ...d, pages: d.pages.map((p) => ({ ...p, messages: p.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })) });
}
export function removeMessage(qc: QueryClient, conv: string, id: string) {
  qc.setQueryData<ThreadData>(messagesKey(conv), (d) => d && { ...d, pages: d.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== id) })) });
}

/** Someone read the conversation: add them to every message's readBy. */
export function markReadBy(qc: QueryClient, conv: string, userId: string) {
  qc.setQueryData<ThreadData>(messagesKey(conv), (d) =>
    d && { ...d, pages: d.pages.map((p) => ({ ...p, messages: p.messages.map((m) => (m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] })) })) },
  );
}

/** Zero the unread badge locally right away; the server round trip follows. */
export function clearUnread(qc: QueryClient, conv: string) {
  qc.setQueryData<ChatConversation[]>(queryKeys.conversations, (l) => l?.map((c) => (c.id === conv ? { ...c, unread: 0 } : c)));
}
