import { http } from '../http';

export interface EmailOutcome {
  status: 'sent' | 'simulated' | 'failed';
  to?: string;
  error?: string;
}
export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  phone?: string;
  photoAt?: string | null;
  active?: boolean;
  totpEnabled?: boolean;
  lastLoginAt?: string | null;
  monthlyTarget?: number | null;
  commissionPct?: number | null;
  branch?: { id: string; name: string } | string | null;
  clientRef?: { id: string; name: string } | string | null;
}
/** Fields POST /users accepts (the backend rejects unknown ones). */
export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  password?: string;
  clientRef?: string;
  branch?: string;
  title?: string;
  phone?: string;
  sendEmail?: boolean;
}
/** Fields PUT /users/:id accepts. */
export interface UpdateUserInput {
  name?: string;
  role?: string;
  active?: boolean;
  clientRef?: string;
  branch?: string;
  title?: string;
  phone?: string;
  monthlyTarget?: number | '';
  commissionPct?: number | '';
}
export interface CreateUserResult {
  user: TeamUser;
  /** present when no email carried it, or the email failed */
  tempPassword?: string;
  email?: EmailOutcome;
}
export interface ResetPasswordResult {
  tempPassword: string;
  email?: EmailOutcome;
}

export const usersApi = {
  base: '/users',
  list: () => http.get<TeamUser[]>('/users'),
  create: (body: CreateUserInput) => http.post<CreateUserResult>('/users', body),
  update: (id: string, body: UpdateUserInput) => http.put<TeamUser>(`/users/${id}`, body),
  resetPassword: (id: string, sendEmail = true) => http.post<ResetPasswordResult>(`/users/${id}/reset-password`, { sendEmail }),
  reset2fa: (id: string) => http.post<{ ok: boolean }>(`/users/${id}/reset-2fa`, {}),
};
