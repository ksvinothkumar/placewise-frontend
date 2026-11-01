import { create } from 'zustand';
import { safeStorage } from '@/lib/storage';

export type Theme = 'light' | 'dark';
export type ToastKind = 'ok' | 'error' | 'chat' | 'notify';
export interface Toast {
  id: number;
  msg: string;
  type: ToastKind;
}

const initialTheme = (): Theme => {
  const saved = safeStorage.get('pw.theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

interface UiState {
  theme: Theme;
  navCollapsed: boolean;
  /** Slide-in drawer on narrow screens (the fixed sidebar is hidden there). */
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  toggleNav: () => void;
  setMobileNav: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  togglePalette: () => void;
  toast: (msg: string, type?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

/** UI-only state: theme, sidebar, command palette, toasts. Server data never goes here (React Query). */
export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  navCollapsed: safeStorage.get('pw.nav') === '1',
  mobileNavOpen: false,
  paletteOpen: false,
  toasts: [],
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      safeStorage.set('pw.theme', theme);
      return { theme };
    }),
  toggleNav: () =>
    set((s) => {
      safeStorage.set('pw.nav', s.navCollapsed ? '0' : '1');
      return { navCollapsed: !s.navCollapsed };
    }),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  toast: (msg, type = 'ok') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Callable outside components (mutation callbacks, socket handlers). */
export const toast = (msg: string, type?: ToastKind) => useUiStore.getState().toast(msg, type);
