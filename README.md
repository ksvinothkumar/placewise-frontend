# placewise-frontend

React 18 + TypeScript (strict) + Vite client for the Placewise recruitment suite. Ports the shell of the legacy `HR_Consultancy/client` onto the
NestJS API at `/api/v1` (see `placewise-backend`). Architecture reference: `HR_Consultancy/docs/PLACEWISE-ARCHITECTURE.md` section 2.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api and /ws to http://localhost:4100
npm run typecheck && npm run lint && npm test && npm run build
```

Env (`.env.example`): `VITE_API_URL` / `VITE_WS_URL` are optional. Leave them empty to use the same-origin proxy (dev) or reverse proxy (prod).
Docker: `docker build -t placewise-frontend .` (node build, nginx runtime on :8080, SPA fallback, hashed assets cached 1y, `index.html` no-cache, CSP).

## Structure

```
src/
  main.tsx                 entry
  app/                     App, router.tsx (full route table, lazy pages), providers.tsx, guards/{RequireAuth,RequirePermission,PublicOnly}
  api/                     http.ts (fetch wrapper), errors.ts (ApiError), queryKeys.ts, hooks.ts (useApiQuery/useApiMutation), types.ts, endpoints/*.ts
  stores/                  session.store.ts, ui.store.ts (zustand)
  realtime/                socket.ts (singleton), useChannel.ts
  components/              layout/{AppShell,PortalShell,Sidebar,Topbar,PublicHeader}, ui/* kit, CommandPalette, Notifications, PhotoEditor, Logo, PagePlaceholder
  features/<area>/         domain UI + hooks, one folder per area (auth is ported, the rest are empty)
  pages/                   one tiny lazy-loaded file per route; renders a feature screen (or PagePlaceholder until ported)
  lib/                     format.ts, permissions.ts (useCan), storage.ts
  styles/                  tokens.css + base.css = legacy styles.css verbatim (do not reformat)
  test/                    vitest setup + msw server
e2e/                       Playwright specs (config only for now)
```

## Rules

1. **Server state lives only in React Query.** Zustand holds session (user, permissions) and UI (theme, sidebar, palette, toasts) only.
2. Pages import from `features/*`; features import from `components/*`, `api/*`, `lib/*`, `stores/*`. Never the reverse.
   **Features never import each other** (enforced by ESLint `no-restricted-imports`). Shared code goes to `lib/` or `components/`.
3. Permissions: `useCan('jobs:view')` (or `useCanFn()` for several). The UI hides, the backend enforces.
4. The access token lives **in memory only** (`api/http.ts`). Never put it in localStorage/sessionStorage. The refresh token is an httpOnly cookie.
5. All HTTP goes through `api/http.ts`: it unwraps `{data, meta}`, throws `ApiError{status, code, message, details, requestId}`, and on 401 does
   one single-flight `POST /auth/refresh` then retries once; a failed refresh clears the session (RequireAuth redirects to `/login`).
6. Query keys come from `api/queryKeys.ts`. After a mutation, invalidate keys (`useApiMutation(fn, { invalidate: [...] })`), do not bump a global version.

## Adding a page (porting a legacy screen)

1. Create `src/features/<area>/<Name>Page.tsx` (+ components, hooks, `use<Thing>.ts` wrapping React Query). Add typed calls to `src/api/endpoints/<area>.ts`.
   Legacy `useApi(path)` becomes `useApiQuery<T>(path)` or a feature hook; legacy `api(path, {method, body})` becomes `http.post/put/delete`; `toast()` is `import { toast } from '@/stores/ui.store'`;
   `useApp().can(p)` becomes `useCan(p)`; `useApp().user` becomes `useSessionStore(s => s.user)`.
2. Replace the body of `src/pages/<Name>Page.tsx` with `export { NamePage as default } from '@/features/<area>/NamePage';`.
3. The route already exists in `app/router.tsx` (with its permission guard); only add a route for genuinely new URLs.
4. Add a vitest + msw test next to the code; add e2e specs under `e2e/` for critical flows.

## Notes

- `mustChangePassword` redirects every staff route to `/profile` (AppShell). Client accounts (`role === 'client'`) get `PortalShell` and are confined to `/portal*` and `/profile`.
- Live updates: `useChannel('event', handler)`; the socket (`/ws`, `auth:{token}`) connects when the session becomes authenticated.
- The legacy service worker (`sw.js`) was intentionally not ported; add a PWA plugin deliberately if installability is needed.
