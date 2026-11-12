import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 7_000 },
  forbidOnly: true,
  retries: 0,
  outputDir: 'qa/.browser-artifacts',
  reporter: [['list'], ['json', { outputFile: 'qa/phase4-environment-browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173/regalo/',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    // Trace snapshots delay trusted touch injection near short jump windows.
    // Failures retain screenshots, network/console audit and read-only snapshots.
    trace: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' }, testIgnore: ['**/phase3-touch*.spec.js', '**/phase4-environment-touch*.spec.js'] },
    { name: 'firefox', use: { browserName: 'firefox' }, testIgnore: ['**/runtime-profile.spec.js', '**/phase3-touch*.spec.js', '**/phase4-environment-touch*.spec.js'] },
    {
      name: 'chromium-touch',
      testMatch: ['**/phase3-touch*.spec.js', '**/phase4-environment-touch*.spec.js'],
      use: { browserName: 'chromium', hasTouch: true, isMobile: true, deviceScaleFactor: 1, viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort --base /regalo/',
    url: 'http://127.0.0.1:4173/regalo/',
    timeout: 30_000,
    reuseExistingServer: false,
  },
});
