import { http } from '../http';
import type { NotificationList } from '../types';

export const notificationsApi = {
  list: (limit = 50) => http.get<NotificationList>('/notifications', { limit }),
  read: (id: string) => http.post<unknown>(`/notifications/${id}/read`),
  readAll: () => http.post<unknown>('/notifications/read-all'),
  clear: () => http.delete<unknown>('/notifications'),
};
