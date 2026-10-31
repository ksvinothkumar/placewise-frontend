import { defineConfig } from '@playwright/test';

// Config only: specs (login, pipeline, invoice, careers) land in e2e/ as features are ported.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
