import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="sp" />
      <div style={{ display: 'flex', gap: 10 }}>{children}</div>
    </div>
  );
}

export const Field = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

export interface KpiProps {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  onClick?: () => void;
}
export const Kpi = ({ icon: Icon, label, value, sub, tone = '', onClick }: KpiProps) => (
  <div
    className={'card kpi ' + tone + (onClick ? ' click' : '')}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div className="ico">
        <Icon size={19} />
      </div>
      {onClick && <span className="more-link">View details →</span>}
    </div>
    <div className="l">{label}</div>
    <div className="v">{value}</div>
    <div className="s">{sub}</div>
  </div>
);
