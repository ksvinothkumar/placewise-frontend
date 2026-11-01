/** Every React Query key lives here so invalidation is greppable. Feature hooks extend the relevant factory. */
export const queryKeys = {
  me: ['me'] as const,
  notifications: ['notifications'] as const,
  /** same key useApiQuery('/chat/conversations') produces, so socket handlers can invalidate it */
  conversations: ['api', '/chat/conversations', null] as const,
  /** generic key used by useApiQuery for ad-hoc GETs */
  path: (path: string, query?: Record<string, unknown>) => ['api', path, query ?? null] as const,
  jobs: {
    all: ['jobs'] as const,
    list: (q?: object) => ['jobs', 'list', q ?? null] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },
  candidates: {
    all: ['candidates'] as const,
    list: (q?: object) => ['candidates', 'list', q ?? null] as const,
    detail: (id: string) => ['candidates', 'detail', id] as const,
  },
  applications: { all: ['applications'] as const, list: (q?: object) => ['applications', 'list', q ?? null] as const },
  interviews: { all: ['interviews'] as const, list: (q?: object) => ['interviews', 'list', q ?? null] as const },
  clients: {
    all: ['clients'] as const,
    list: (q?: object) => ['clients', 'list', q ?? null] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  leads: { all: ['leads'] as const, list: (q?: object) => ['leads', 'list', q ?? null] as const },
  invoices: {
    all: ['invoices'] as const,
    list: (q?: object) => ['invoices', 'list', q ?? null] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  tasks: { all: ['tasks'] as const, list: (q?: object) => ['tasks', 'list', q ?? null] as const },
  attendance: { all: ['attendance'] as const },
  sourcing: { all: ['sourcing'] as const },
  roles: { all: ['roles'] as const },
  users: { all: ['users'] as const, list: (q?: object) => ['users', 'list', q ?? null] as const },
  settings: { all: ['settings'] as const },
  webhooks: { all: ['webhooks'] as const },
  reports: { all: ['reports'] as const },
  audit: { all: ['audit'] as const },
  registrations: { all: ['registrations'] as const },
  careers: { all: ['careers'] as const, jobs: ['careers', 'jobs'] as const, job: (id: string) => ['careers', 'job', id] as const },
  portal: { all: ['portal'] as const },
};
