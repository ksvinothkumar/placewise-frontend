import { http } from '../http';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string | null;
  done: boolean;
  overdue?: boolean;
  priority: TaskPriority;
  assignee?: { id: string; name: string };
  candidate?: { id: string; name: string } | null;
  job?: { id: string; title: string } | null;
}
export interface TaskBody {
  title: string;
  notes?: string;
  due?: string;
  priority: TaskPriority;
  assignee?: string;
  candidate?: string;
  job?: string;
}

export const tasksApi = {
  base: '/tasks',
  list: (query: { status?: 'open' | 'done'; scope?: 'mine' | 'all'; candidate?: string }) => http.get<Task[]>('/tasks', query),
  create: (body: TaskBody) => http.post<Task>('/tasks', body),
  setDone: (id: string, done: boolean) => http.put<Task>(`/tasks/${id}`, { done }),
  remove: (id: string) => http.delete<{ ok: boolean }>(`/tasks/${id}`),
};
