import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicOnly } from './guards/PublicOnly';
import { RequireAuth } from './guards/RequireAuth';
import { RequirePermission } from './guards/RequirePermission';

/** Lazy route: the page module is fetched on first visit. Pages live in src/pages and default-export a component. */
const page = (load: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

/** Group routes behind a permission (legacy `<Need perm=...>`). */
const needs = (perm: string, children: RouteObject[]): RouteObject => ({ element: <RequirePermission perm={perm} />, children });

// Every route from the legacy client/src/main.jsx. Staff and client-portal routes share one authenticated frame (AppShell picks the layout by role).
export const routes: RouteObject[] = [
  { path: '/login', element: <PublicOnly />, children: [{ index: true, ...page(() => import('@/pages/LoginPage')) }] },

  // public careers site
  {
    element: <PublicHeader />,
    children: [
      { path: '/career', element: <Navigate to="/careers" replace /> }, // short link used by the marketing site
      { path: '/careers', ...page(() => import('@/pages/CareersPage')) },
      { path: '/careers/:id', ...page(() => import('@/pages/CareerJobPage')) },
    ],
  },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', ...page(() => import('@/pages/DashboardPage')) },
          { path: 'jobs', ...page(() => import('@/pages/JobsPage')) },
          { path: 'jobs/:id', ...page(() => import('@/pages/JobDetailPage')) },
          { path: 'candidates', ...page(() => import('@/pages/CandidatesPage')) },
          { path: 'candidates/:id', ...page(() => import('@/pages/CandidateProfilePage')) },
          { path: 'pipeline', ...page(() => import('@/pages/PipelinePage')) },
          { path: 'interviews', ...page(() => import('@/pages/InterviewsPage')) },
          { path: 'clients', ...page(() => import('@/pages/ClientsPage')) },
          { path: 'clients/:id', ...page(() => import('@/pages/ClientProfilePage')) },
          { path: 'clients/:id/report', ...page(() => import('@/pages/ClientReportPage')) },
          { path: 'portal', ...page(() => import('@/pages/PortalPage')) },
          { path: 'portal/jobs/:id', ...page(() => import('@/pages/PortalJobPage')) },
          { path: 'tasks', ...page(() => import('@/pages/TasksPage')) },
          { path: 'notes', ...page(() => import('@/pages/NotesPage')) },
          { path: 'org', ...page(() => import('@/pages/OrgChartPage')) },
          { path: 'chat', ...page(() => import('@/pages/ChatPage')) },
          { path: 'chat/:id', ...page(() => import('@/pages/ChatPage')) },
          { path: 'profile', ...page(() => import('@/pages/ProfilePage')) },

          needs('reports:view', [{ path: 'reports', ...page(() => import('@/pages/ReportsPage')) }]),
          needs('invoices:manage', [
            { path: 'invoices', ...page(() => import('@/pages/InvoicesPage')) },
            { path: 'invoices/:id', ...page(() => import('@/pages/InvoiceViewPage')) },
          ]),
          needs('registrations:manage', [{ path: 'registrations', ...page(() => import('@/pages/RegistrationsPage')) }]),
          needs('audit:view', [{ path: 'audit', ...page(() => import('@/pages/AuditPage')) }]),
          needs('crm:view', [
            { path: 'crm', ...page(() => import('@/pages/CrmPage')) },
            { path: 'crm/companies/:id', ...page(() => import('@/pages/CompanyDetailPage')) },
          ]),
          needs('attendance:self', [{ path: 'attendance', ...page(() => import('@/pages/AttendancePage')) }]),
          needs('candidates:view', [{ path: 'sourcing', ...page(() => import('@/pages/SourcingPage')) }]),
          needs('integrations:manage', [{ path: 'integrations', ...page(() => import('@/pages/IntegrationsPage')) }]),
          needs('roles:manage', [{ path: 'roles', ...page(() => import('@/pages/RolesPage')) }]),
          needs('settings:manage', [{ path: 'settings', ...page(() => import('@/pages/SettingsPage')) }]),
          needs('users:manage', [{ path: 'users', ...page(() => import('@/pages/UsersPage')) }]),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
