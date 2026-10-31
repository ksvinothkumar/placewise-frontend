import { create } from 'zustand';
import { authApi } from '@/api/endpoints/auth';
import { ApiError } from '@/api/errors';
import { refreshAccessToken, setAccessToken, setAuthLostHandler } from '@/api/http';
import type { LoginResult, MeResult, SessionUser } from '@/api/types';
import { setRoleNames, setStages } from '@/lib/format';

export type SessionStatus = 'booting' | 'authed' | 'anon';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  permissions: string[];
  ai: boolean;
  mail: boolean;
  /** restore the session from the httpOnly refresh cookie; safe to call repeatedly (StrictMode) */
  bootstrap: () => Promise<void>;
  /** returns a challenge when two-step verification is required, otherwise null once signed in */
  login: (email: string, password: string) => Promise<{ ticket: string } | null>;
  login2fa: (ticket: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  /** reload profile + permissions from /auth/me (after profile/password/photo changes) */
  refreshMe: () => Promise<void>;
  setUser: (user: SessionUser) => void;
  /** @internal used by the http layer when refresh fails */
  clear: () => void;
}

const applyMe = (m: MeResult) => {
  setRoleNames(m.roleNames);
  setStages(m.stages);
  return { user: m.user, permissions: m.permissions ?? [], ai: !!m.ai, mail: !!m.mail };
};

let booting: Promise<void> | null = null;

/** Session state only (who am I, what may I do). The access token itself lives in api/http.ts memory, not here. */
export const useSessionStore = create<SessionState>((set, get) => {
  const finish = (r: LoginResult) => {
    setAccessToken(r.token);
    set({ status: 'authed', user: r.user, permissions: r.permissions ?? [] });
    // login does not return ai/mail flags or role names; fill them in without blocking the redirect
    void authApi
      .me()
      .then((m) => set(applyMe(m)))
      .catch(() => {});
  };
  return {
    status: 'booting',
    user: null,
    permissions: [],
    ai: false,
    mail: false,

    bootstrap: () => {
      booting ??= (async () => {
        try {
          await refreshAccessToken();
          set({ ...applyMe(await authApi.me()), status: 'authed' });
        } catch (e) {
          // 401 = no/expired cookie = genuinely signed out. Anything else (server restarting) must not look like a logout in a loop;
          // we still land on the login screen, where the user can retry.
          if (!(e instanceof ApiError)) console.warn('session bootstrap failed', e);
          setAccessToken(null);
          set({ status: 'anon', user: null, permissions: [] });
        }
      })().finally(() => {
        booting = null;
      });
      return booting;
    },

    login: async (email, password) => {
      const r = await authApi.login(email, password);
      if ('twoFactor' in r && r.twoFactor) return { ticket: r.ticket };
      finish(r as LoginResult);
      return null;
    },
    login2fa: async (ticket, code) => finish(await authApi.login2fa(ticket, code)),

    logout: async () => {
      try {
        await authApi.logout();
      } catch {
        /* cookie may already be gone; still sign out locally */
      }
      get().clear();
    },
    refreshMe: async () => set(applyMe(await authApi.me())),
    setUser: (user) => set({ user }),
    clear: () => {
      setAccessToken(null);
      set({ status: 'anon', user: null, permissions: [], ai: false, mail: false });
    },
  };
});

// A failed refresh (or a second 401) anywhere in the app ends the session; RequireAuth then redirects to /login.
setAuthLostHandler(() => useSessionStore.getState().clear());
