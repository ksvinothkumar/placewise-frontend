import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { isApiError } from '@/api/errors';
import { ToastHost } from '@/components/ui/Toast';
import { connectSocket, disconnectSocket } from '@/realtime/socket';
import { useSessionStore } from '@/stores/session.store';
import { useUiStore } from '@/stores/ui.store';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        // client errors will not fix themselves; only retry network/5xx once
        retry: (count, err) => count < 1 && !(isApiError(err) && err.status >= 400 && err.status < 500),
      },
    },
  });

/** data-theme on <html> follows the UI store */
function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}

/** Restores the session from the refresh cookie once on load. */
function SessionBootstrap() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  useEffect(() => void bootstrap(), [bootstrap]);
  return null;
}

/** One Socket.IO connection for the signed-in session. */
function SocketBridge() {
  const status = useSessionStore((s) => s.status);
  useEffect(() => {
    if (status === 'authed') connectSocket();
    else disconnectSocket();
    return disconnectSocket;
  }, [status]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const status = useSessionStore((s) => s.status);
  // drop cached server data when the session ends so the next user never sees it
  useEffect(() => {
    if (status === 'anon') client.clear();
  }, [status, client]);
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <SessionBootstrap />
      <SocketBridge />
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
