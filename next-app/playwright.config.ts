import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Next.js loads .env.local automatically for the app server, but standalone
// Node scripts (global-setup/teardown) need it loaded manually.
const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  // Generous timeout: first hit on a route triggers a cold Turbopack dev
  // compile (heaviest on map-bearing pages), which can take well over 30s.
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
