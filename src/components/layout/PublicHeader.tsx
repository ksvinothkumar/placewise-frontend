import { Link, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';
import { LogoMark } from '../Logo';

/** Header + frame for public pages (/careers). The pages themselves bring their own hero and body. */
export function PublicHeader() {
  const authed = useSessionStore((s) => s.status === 'authed');
  return (
    <>
      <header className="topbar" style={{ padding: '0 28px' }}>
        <Link to="/careers" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LogoMark size={34} shadow={false} />
          <b style={{ fontSize: 17, letterSpacing: '-.02em' }}>
            Place<span style={{ color: 'var(--brand)' }}>wise</span>
          </b>
        </Link>
        <Link to="/careers" style={{ marginLeft: 18, color: 'var(--text2)', fontWeight: 600 }}>
          Careers
        </Link>
        <span style={{ flex: 1 }} />
        <Link className="btn sm" to={authed ? '/' : '/login'}>
          {authed ? 'Open workspace' : 'Staff sign in'}
        </Link>
      </header>
      <Outlet />
    </>
  );
}
