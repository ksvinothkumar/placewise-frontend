import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const EmptyState = ({ title, sub, icon: Icon = Inbox }: { title: ReactNode; sub?: ReactNode; icon?: LucideIcon }) => (
  <div className="empty">
    <Icon size={34} strokeWidth={1.5} />
    <b>{title}</b>
    {sub}
  </div>
);
/** legacy name */
export const Empty = EmptyState;
