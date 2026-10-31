import { http } from '../http';

export interface ChatPeer {
  id: string;
  name: string;
  role: string;
  title?: string;
  photoAt?: string | null;
  active?: boolean;
}
export interface ChatConversation {
  id: string;
  type: 'direct' | 'channel' | string;
  name?: string;
  peer: ChatPeer | null;
  lastMessage: { text: string; mine: boolean; at?: string } | null;
  lastMessageAt?: string;
  unread: number;
}
export interface ChatMessage {
  id: string;
  conversation: string;
  sender: { id: string; name?: string };
  text: string;
  createdAt: string;
  readBy: string[];
}
export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
}
export interface ChatTeammate {
  id: string;
  name: string;
  role: string;
  title?: string;
  photoAt?: string | null;
  online?: boolean;
}

export const chatApi = {
  base: '/chat',
  teammates: () => http.get<ChatTeammate[]>('/chat/users'),
  conversations: () => http.get<ChatConversation[]>('/chat/conversations'),
  openDirect: (userId: string) => http.post<{ id: string }>('/chat/conversations', { userId }),
  messages: (id: string, before?: string) => http.get<MessagePage>(`/chat/conversations/${id}/messages`, { before }),
  /** REST fallback for when the socket is down */
  send: (id: string, text: string) => http.post<ChatMessage>(`/chat/conversations/${id}/messages`, { text }),
  read: (id: string) => http.post<{ ok: boolean }>(`/chat/conversations/${id}/read`, {}),
};
