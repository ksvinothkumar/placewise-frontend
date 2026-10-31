import { http } from '../http';

export type NoteKind = 'comment' | 'call' | 'meeting' | 'email' | 'whatsapp' | 'system';
export interface Note {
  id: string;
  kind: NoteKind;
  text: string;
  byName?: string;
  outcome?: string;
  durationMin?: number;
  mentions?: { id: string; name: string }[];
  createdAt: string;
  canDelete?: boolean;
}
export interface NoteBody {
  entityType: 'candidate' | 'company' | 'contact';
  entityId: string;
  kind: Exclude<NoteKind, 'system'>;
  text: string;
  outcome?: string;
  durationMin?: number;
  mentions?: string[];
}
export interface TeamMember {
  id: string;
  name: string;
  title?: string;
  role?: string;
}

export const notesApi = {
  list: (entityType: string, entityId: string) => http.get<Note[]>('/notes', { entityType, entityId }),
  create: (body: NoteBody) => http.post<Note>('/notes', body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/notes/${id}`),
};
export const teamApi = { users: () => http.get<TeamMember[]>('/chat/users') };
