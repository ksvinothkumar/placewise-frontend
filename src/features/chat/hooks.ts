import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, type ChatConversation } from '@/api/endpoints/chat';
import { useApiMutation, useApiQuery } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { seedPresence } from '@/realtime/chatPresence';
import { useChannel } from '@/realtime/useChannel';
import { setOpenConversation } from '@/realtime/useChatToasts';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { emitRead, sendMessage } from './chatSocket';
import { appendMessage, clearUnread, markReadBy, messagesKey, patchMessage, removeMessage, resolveMessage, type ThreadData, type ThreadMessage } from './messageCache';

/** Same cache entry the sidebar badge reads (queryKeys.conversations), so a refresh here updates both. */
export const useConversations = () => useApiQuery<ChatConversation[]>('/chat/conversations', undefined, { retry: false });

export function useTeammates() {
  const q = useQuery({ queryKey: ['chat', 'users'], queryFn: () => chatApi.teammates(), retry: false });
  useEffect(() => {
    if (q.data) seedPresence(q.data.filter((u) => u.online).map((u) => u.id));
  }, [q.data]);
  return q;
}

export const useOpenDirect = () =>
  useApiMutation((userId: string) => chatApi.openDirect(userId), { invalidate: [queryKeys.conversations] });

/** Typing indicators are momentary UI, kept in component state: { conversationId: name } cleared after 3 s of silence. */
export function useTyping() {
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const clear = useCallback((conversation: string) => setTyping(({ [conversation]: _gone, ...rest }) => rest), []);
  useChannel<{ conversation: string; name: string }>('typing', ({ conversation, name }) => {
    const at = Date.now();
    setTyping((t) => ({ ...t, [conversation]: { name, at } }));
    setTimeout(() => setTyping((t) => (t[conversation]?.at === at ? (({ [conversation]: _g, ...r }) => r)(t) : t)), 3000);
  });
  return { typing, clear };
}

/** Live socket events that touch cached threads and the list. Mount once while the chat screen is open. */
export function useChatRealtime(openId: string | undefined, onMessageIn: (conversation: string) => void) {
  const qc = useQueryClient();
  const meId = useSessionStore((s) => s.user?.id);
  useEffect(() => {
    setOpenConversation(openId ?? null);
    return () => setOpenConversation(null);
  }, [openId]);

  useChannel<{ message: ThreadMessage }>('message', ({ message: m }) => {
    appendMessage(qc, m);
    void qc.invalidateQueries({ queryKey: queryKeys.conversations });
    onMessageIn(m.conversation);
    if (m.conversation === openId && m.sender.id !== meId) void emitRead(m.conversation);
  });
  useChannel<{ conversation: string; userId: string }>('read', ({ conversation, userId }) => {
    markReadBy(qc, conversation, userId);
    void qc.invalidateQueries({ queryKey: queryKeys.conversations });
  });
  // after a reconnect we may have missed events
  useChannel('connect', () => {
    void qc.invalidateQueries({ queryKey: queryKeys.conversations });
    if (openId) void qc.invalidateQueries({ queryKey: messagesKey(openId) });
  });
}

/** Paged history (page 0 = newest). Older pages are fetched with the `before` cursor. */
export function useThread(conversation: string) {
  return useInfiniteQuery({
    queryKey: messagesKey(conversation),
    queryFn: ({ pageParam }) => chatApi.messages(conversation, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.messages[0]?.createdAt : undefined),
    staleTime: 0,
    select: (d) => d as unknown as ThreadData,
  });
}

let tmpSeq = 0;
/** Optimistic send: the bubble appears immediately as `sending`, then is replaced by the acked message or marked `failed`. */
export function useSend(conversation: string) {
  const qc = useQueryClient();
  const me = useSessionStore((s) => s.user);
  const send = useCallback(
    async (text: string) => {
      if (!me) return;
      const tmp: ThreadMessage = {
        id: `tmp-${++tmpSeq}`,
        conversation,
        sender: { id: me.id, name: me.name },
        text,
        createdAt: new Date().toISOString(),
        readBy: [me.id],
        pending: 'sending',
      };
      appendMessage(qc, tmp);
      try {
        resolveMessage(qc, conversation, tmp.id, await sendMessage(conversation, text));
        void qc.invalidateQueries({ queryKey: queryKeys.conversations });
      } catch (e) {
        patchMessage(qc, conversation, tmp.id, { pending: 'failed' });
        toast(e instanceof Error ? e.message : 'Could not send the message', 'error');
      }
    },
    [qc, me, conversation],
  );
  const retry = useCallback(
    (m: ThreadMessage) => {
      removeMessage(qc, conversation, m.id);
      return send(m.text);
    },
    [qc, conversation, send],
  );
  const discard = useCallback((m: ThreadMessage) => removeMessage(qc, conversation, m.id), [qc, conversation]);
  return { send, retry, discard };
}

/** Mark a conversation read (socket if connected, else REST) and zero its badge at once. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useCallback(
    (conversation: string) => {
      void emitRead(conversation);
      clearUnread(qc, conversation);
    },
    [qc],
  );
}

/** Stable "stick to bottom" bookkeeping for the scroll container. */
export function useStickyScroll() {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const onScroll = () => {
    const b = box.current;
    if (b) stick.current = b.scrollHeight - b.scrollTop - b.clientHeight < 80;
  };
  return { box, stick, onScroll };
}
