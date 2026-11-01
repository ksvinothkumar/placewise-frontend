import {
  Briefcase,
  Building2,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Handshake,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Plug,
  Radar,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  /** permission needed; omitted = everyone who can sign in to this layout */
  perm?: string;
}

// Ported from legacy components/Layout.jsx GROUPS
export const GROUPS: readonly (readonly [string, readonly NavItem[]])[] = [
  [
    'Recruit',
    [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/jobs', icon: Briefcase, label: 'Jobs', perm: 'jobs:view' },
      { to: '/candidates', icon: Users, label: 'Talent pool', perm: 'candidates:view' },
      { to: '/sourcing', icon: Radar, label: 'Sourcing', perm: 'candidates:view' },
      { to: '/pipeline', icon: KanbanSquare, label: 'Pipeline', perm: 'pipeline:view' },
      { to: '/interviews', icon: CalendarDays, label: 'Interviews', perm: 'interviews:view' },
      { to: '/tasks', icon: ListChecks, label: 'Tasks' },
    ],
  ],
  [
    'Business',
    [
      { to: '/crm', icon: Handshake, label: 'Leads & CRM', perm: 'crm:view' },
      { to: '/clients', icon: Building2, label: 'Clients', perm: 'clients:view' },
      { to: '/invoices', icon: FileText, label: 'Invoices', perm: 'invoices:view' },
      { to: '/reports', icon: BarChart3, label: 'Reports', perm: 'reports:view' },
    ],
  ],
  [
    'Workspace',
    [
      { to: '/chat', icon: MessageSquare, label: 'Chat' },
      { to: '/attendance', icon: CalendarCheck, label: 'Attendance', perm: 'attendance:self' },
      { to: '/users', icon: ShieldCheck, label: 'Team', perm: 'users:manage' },
      { to: '/registrations', icon: ClipboardCheck, label: 'Registrations', perm: 'registrations:manage' },
      { to: '/roles', icon: KeyRound, label: 'Roles & access', perm: 'roles:manage' },
      { to: '/settings', icon: Settings, label: 'Settings', perm: 'settings:manage' },
      { to: '/integrations', icon: Plug, label: 'Integrations', perm: 'integrations:manage' },
      { to: '/audit', icon: ScrollText, label: 'Audit log', perm: 'audit:view' },
    ],
  ],
];

export const TITLES: Record<string, string> = {
  attendance: 'Attendance & leave',
  crm: 'Leads & CRM',
  roles: 'Roles & access',
  settings: 'Settings',
  sourcing: 'Sourcing',
  integrations: 'Integrations',
  reports: 'Reports',
  tasks: 'Tasks',
  invoices: 'Invoices',
  audit: 'Audit log',
  registrations: 'Registrations',
  chat: 'Chat',
  users: 'Team',
  profile: 'My profile',
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  candidates: 'Talent pool',
  pipeline: 'Pipeline',
  interviews: 'Interviews',
  clients: 'Clients',
};

/** Sidebar entries visible to a user holding `can`. Pure, so it is unit-testable. */
export const visibleGroups = (can: (p?: string) => boolean) =>
  GROUPS.map(([group, items]) => [group, items.filter((i) => can(i.perm))] as const).filter(([, items]) => items.length > 0);
