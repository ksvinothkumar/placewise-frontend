import { AlertCircle, Bell, CheckCircle2, MessageCircle } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + (t.type === 'error' ? 'error' : '')}>
          {t.type === 'error' ? (
            <AlertCircle size={17} />
          ) : t.type === 'chat' ? (
            <MessageCircle size={17} />
          ) : t.type === 'notify' ? (
            <Bell size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
