import type { RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

const paths = (rs: RouteObject[], base = ''): string[] =>
  rs.flatMap((r) => {
    const here = r.path ? `${base}/${r.path}`.replace(/\/+/g, '/') : base;
    return [...(r.path ? [here] : []), ...paths(r.children ?? [], here)];
  });

// every path registered in the legacy client/src/main.jsx
const LEGACY = [
  '/login',
  '/careers',
  '/careers/:id',
  '/dashboard',
  '/jobs',
  '/jobs/:id',
  '/candidates',
  '/candidates/:id',
  '/pipeline',
  '/interviews',
  '/clients',
  '/portal',
  '/portal/jobs/:id',
  '/tasks',
  '/reports',
  '/clients/:id/report',
  '/invoices',
  '/invoices/:id',
  '/audit',
  '/crm',
  '/crm/companies/:id',
  '/attendance',
  '/sourcing',
  '/integrations',
  '/roles',
  '/settings',
  '/chat',
  '/chat/:id',
  '/profile',
  '/users',
];

describe('route table', () => {
  it('contains every legacy route', () => {
    const have = new Set(paths(routes));
    expect(LEGACY.filter((p) => !have.has(p))).toEqual([]);
  });
});
