import { Link, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/stores/session.store';
import { LogoMark } from '../Logo';

/** Frame for the public careers site: brand, in-page nav (Open roles / How we hire / FAQ), staff sign-in, footer. */
export function PublicHeader() {
  const authed = useSessionStore((s) => s.status === 'authed');
  return (
    <div className="pub">
      <header className="pub-top">
        <Link to="/careers" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LogoMark size={34} shadow={false} />
          <b style={{ fontSize: 18, letterSpacing: '-.02em' }}>
            Place<span style={{ color: 'var(--brand)' }}>wise</span> <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Careers</span>
          </b>
        </Link>
        <nav className="pub-nav" aria-label="Careers">
          <Link to="/careers#roles">Open roles</Link>
          <Link to="/careers#how">How we hire</Link>
          <Link to="/careers#faq">FAQ</Link>
          <Link to={authed ? '/' : '/login'} className="pub-staff">
            {authed ? 'Open workspace' : 'Staff sign in'}
          </Link>
        </nav>
      </header>
      <Outlet />
      <footer className="pub-foot">© Placewise · Your details are used only for recruitment and shared with our client for roles you apply to.</footer>
    </div>
  );
}
