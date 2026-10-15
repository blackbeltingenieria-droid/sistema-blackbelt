import { defineConfig } from '@playwright/test';

// E2E locales: usan datos seed (sin Supabase). Se ejecutan a 3 anchos.
const exe = process.env.PW_CHROMIUM_PATH;
const use = {
  baseURL: 'http://127.0.0.1:5173',
  launchOptions: exe ? { executablePath: exe, args: ['--no-sandbox'] } : {},
};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use,
  projects: [
    { name: 'mobile-375', use: { ...use, viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { ...use, viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1280', use: { ...use, viewport: { width: 1280, height: 800 } } },
  ],
  // 5173: datos seed básicos · 5174: modo demo (datos de demostración en memoria)
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run dev:demo -- --host 127.0.0.1 --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: true, timeout: 60_000 },
  ],
});
