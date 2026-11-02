import { http } from '../http';

export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'gray';
export type TeamAccess = 'none' | 'view' | 'edit';
export const NOTE_COLORS: readonly NoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple', 'gray'];

export interface NoteShare {
  id: string;
  name: string;
  canEdit: boolean;
}
export interface UserNote {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  owner: { id: string; name: string };
  /** I own it */
  mine: boolean;
  canEdit: boolean;
  team: TeamAccess;
  /** people + the whole team (as one) this note is shared with */
  sharedCount: number;
  /** only the owner is told who */
  shares: NoteShare[];
  updatedByName?: string;
  updatedAt?: string;
}
export type NoteScope = 'all' | 'mine' | 'shared';

export const notebookApi = {
  base: '/notebook',
  list: (scope: NoteScope, q: string, signal?: AbortSignal) => http.get<UserNote[]>('/notebook', { scope, q: q || undefined }, signal),
  create: (body: { title: string; body: string; color: NoteColor }) => http.post<UserNote>('/notebook', body),
  update: (id: string, body: Partial<{ title: string; body: string; color: NoteColor; pinned: boolean }>) => http.put<UserNote>(`/notebook/${id}`, body),
  share: (id: string, body: { users: { id: string; canEdit: boolean }[]; team: TeamAccess }) => http.put<UserNote>(`/notebook/${id}/share`, body),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/notebook/${id}`),
};
