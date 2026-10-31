import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessage } from '@/api/endpoints/chat';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useChannel } from './useChannel';

let openConversation: string | null = null;
/** The chat screen tells us which thread is on screen so it does not toast for it. */
export const setOpenConversation = (id: string | null) => {
  openConversation = id;
};

/**
 * Mount once in the signed-in shell: toast "Name: text" for a message in a conversation the user is not looking at, and
 * keep the conversation list (and so the sidebar unread badge) fresh. Works on any page.
 */
export function useChatToasts() {
  const qc = useQueryClient();
  const meId = useSessionStore((s) => s.user?.id);
  useChannel<{ message: ChatMessage }>('message', ({ message: m }) => {
    void qc.invalidateQueries({ queryKey: queryKeys.conversations });
    if (m.sender.id !== meId && openConversation !== m.conversation) toast(`${m.sender.name ?? 'Someone'}: ${m.text.slice(0, 70)}`, 'chat');
  });
}
