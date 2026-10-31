/** Shapes inside `data` for the endpoints the shell uses. Feature areas add their own types next to their code. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  phone?: string;
  photoAt?: string | null;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  [k: string]: unknown;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
  user: SessionUser;
  permissions: string[];
}
/** returned instead of LoginResult when the account has two-step verification on */
export interface TwoFactorChallenge {
  twoFactor: true;
  ticket: string;
}

export interface MeResult {
  user: SessionUser;
  permissions: string[];
  roleNames?: Record<string, string>;
  stages?: { name: string; color: string; prob: number; kind: string }[];
  ai?: boolean;
  mail?: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  actor?: string;
  readAt?: string | null;
  createdAt: string;
}
export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export interface Conversation {
  id: string;
  unread?: number;
  [k: string]: unknown;
}
