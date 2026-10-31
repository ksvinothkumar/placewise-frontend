import { http } from '../http';
import type { LoginResult, MeResult, SessionUser, TwoFactorChallenge } from '../types';

export interface TwoFactorStatus {
  enabled: boolean;
  recoveryLeft?: number;
}

export const authApi = {
  login: (email: string, password: string) => http.post<LoginResult | TwoFactorChallenge>('/auth/login', { email, password }),
  login2fa: (ticket: string, code: string) => http.post<LoginResult>('/auth/login/2fa', { ticket, code }),
  logout: () => http.post<void>('/auth/logout'),
  me: () => http.get<MeResult>('/auth/me'),
  /** legacy returned { user }; the new API returns the user directly. Accept both. */
  updateProfile: async (body: { name: string; title?: string; phone?: string }) => {
    const r = await http.put<SessionUser & { user?: SessionUser }>('/auth/profile', body);
    return r.user ?? r;
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    http.put<{ ok: boolean }>('/auth/password', { currentPassword, newPassword }),
  photoPath: '/auth/photo',
  savePhoto: (dataUrl: string, path = '/auth/photo') => http.put<unknown>(path, { dataUrl }),
  removePhoto: (path = '/auth/photo') => http.delete<unknown>(path),
  twoFactor: {
    status: () => http.get<TwoFactorStatus>('/auth/2fa/status'),
    setup: () => http.post<{ qr: string; secret: string }>('/auth/2fa/setup'),
    enable: (code: string) => http.post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { code }),
    disable: (password: string, code: string) => http.post<unknown>('/auth/2fa/disable', { password, code }),
  },
};
