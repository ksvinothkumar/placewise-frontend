import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  BadgeCheck,
  Bell,
  BellOff,
  Briefcase,
  CalendarClock,
  CheckCheck,
  FileText,
  KanbanSquare,
  KeyRound,
  ListChecks,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/api/endpoints/notifications';
import { queryKeys } from '@/api/queryKeys';
import type { AppNotification, NotificationList } from '@/api/types';
import { rel } from '@/lib/format';
import { useChannel } from '@/realtime/useChannel';
import { toast } from '@/stores/ui.store';
import { Tabs } from './ui/Tabs';

type Icon = LucideIcon;
const KIND: Record<string, [Icon, string, string]> = {
  job: [Briefcase, 'var(--brand)', 'var(--brand-soft)'],
  candidate: [UserPlus, 'var(--info)', 'var(--info-soft)'],
  pipeline: [KanbanSquare, 'var(--brand)', 'var(--brand-soft)'],
  placed: [BadgeCheck, 'var(--good)', 'var(--good-soft)'],
  interview: [CalendarClock, 'var(--brand)', 'var(--brand-soft)'],
  reminder: [AlarmClock, 'var(--warn)', 'var(--warn-soft)'],
  security: [KeyRound, 'var(--bad)', 'var(--bad-soft)'],
  team: [ShieldCheck, 'var(--info)', 'var(--info-soft)'],
  task: [ListChecks, 'var(--warn)', 'var(--warn-soft)'],
  invoice: [FileText, 'var(--bad)', 'var(--bad-soft)'],
};

/** Notification list in the React Query cache, plus optimistic read/clear actions and the live socket feed. */
export function useNotifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queryKeys.notifications, queryFn: () => notificationsApi.list(50), retry: false, staleTime: 30_000 });
  const patch = (fn: (l: NotificationList) => NotificationList) =>
    qc.setQueryData<NotificationList>(queryKeys.notifications, (l) => fn(l ?? { items: [], unread: 0 }));

  useChannel<AppNotification>('notification', (n) => {
    patch((l) => ({ items: [n, ...l.items.filter((x) => x.id !== n.id)].slice(0, 50), unread: l.unread + 1 }));
    toast(n.title + (n.body ? ': ' + n.body : ''), 'notify');
  });

  const items = q.data?.items ?? [];
  return {
    items,
    unread: q.data?.unread ?? 0,
    read: (id: string) => {
      patch((l) => ({
        items: l.items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
        unread: Math.max(0, l.unread - (l.items.find((n) => n.id === id && !n.readAt) ? 1 : 0)),
      }));
      notificationsApi.read(id).catch(() => {});
    },
    readAll: () => {
      patch((l) => ({ items: l.items.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })), unread: 0 }));
      notificationsApi.readAll().catch(() => {});
    },
    clear: () => {
      patch(() => ({ items: [], unread: 0 }));
      notificationsApi.clear().catch(() => {});
    },
  };
}

export default function Notifications() {
  const { items, unread, read, readAll, clear } = useNotifications();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const list = tab === 'unread' ? items.filter((n) => !n.readAt) : items;
  const go = (n: AppNotification) => {
    read(n.id);
    setOpen(false);
    if (n.link) nav(n.link);
  };
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button
        className="iconbtn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        style={{ position: 'relative' }}
      >
        <Bell size={17} />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-h">
            <b>Notifications</b>
            {unread > 0 && <span className="badge brand">{unread} new</span>}
            <button className="btn sm ghost" style={{ marginLeft: 'auto' }} disabled={!unread} onClick={readAll}>
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>
          <Tabs
            style={{ margin: '0 16px 8px', alignSelf: 'flex-start' }}
            tabs={
              [
                ['all', 'All'],
                ['unread', 'Unread'],
              ] as const
            }
            value={tab}
            onChange={setTab}
          />
          <div className="notif-list">
            {list.length ? (
              list.map((n) => {
                const [I, c, bg] = KIND[n.type] ?? [Bell, 'var(--text2)', 'var(--surface2)'];
                return (
                  <div key={n.id} className={'notif-item ' + (n.readAt ? '' : 'unread')} onClick={() => go(n)}>
                    <div className="notif-ic" style={{ color: c, background: bg }}>
                      <I size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{n.title}</div>
                      {n.body && <div className="b">{n.body}</div>}
                      <div className="m">
                        {n.actor ? n.actor + ' · ' : ''}
                        {rel(n.createdAt)}
                      </div>
                    </div>
                    {!n.readAt && <i className="udot" />}
                  </div>
                );
              })
            ) : (
              <div className="empty" style={{ padding: '36px 20px' }}>
                <BellOff size={30} strokeWidth={1.5} />
                <b>{tab === 'unread' ? 'No unread notifications' : "You're all caught up"}</b>
                {tab === 'unread' ? 'Everything has been read.' : 'New activity will show up here.'}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="notif-f">
              <button className="btn sm ghost danger" onClick={clear}>
                <Trash2 size={13} />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
