import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleLabel } from '@/lib/format';
import { useSessionStore } from '@/stores/session.store';
import { CandidatePhoto } from '../ui/Avatar';

export function UserMenu() {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  if (!user) return null;
  return (
    <div className="user" ref={ref} onClick={() => setOpen((m) => !m)} role="button" aria-haspopup="menu" aria-expanded={open}>
      <CandidatePhoto c={user} size={36} path="/auth/photo" />
      <div className="meta">
        <b>{user.name}</b>
        <span>{roleLabel(user.role)}</span>
      </div>
      <ChevronDown size={15} color="var(--muted)" />
      {open && (
        <div className="menu">
          <button onClick={() => nav('/profile')}>
            <UserRound size={15} />
            My profile
          </button>
          <button
            onClick={() => {
              void logout().then(() => nav('/login'));
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
