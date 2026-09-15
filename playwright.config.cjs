const path = require('path');
const { defineConfig } = require('playwright/test');

const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);
const baseURL = `http://127.0.0.1:${webPort}`;
const smokeJsonOutputFile = String(process.env.PLAYWRIGHT_SMOKE_JSON_OUTPUT_FILE || '').trim();
const baseReporter = process.env.CI ? 'line' : 'list';
const reporter = smokeJsonOutputFile
  ? [[baseReporter], ['json', {outputFile: smokeJsonOutputFile}]]
  : baseReporter;

module.exports = defineConfig({
  testDir: path.join(__dirname),
  testMatch: ['**/src/tests/browser/**/*.spec.js'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter,
  timeout: 30000,
  workers: 1,
  use: {
    baseURL,
    screenshot: 'on',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: `${JSON.stringify(process.execPath)} ${JSON.stringify(path.join(__dirname, 'scripts/playwright-web-server.cjs'))}`,
    reuseExistingServer: !process.env.CI,
    timeout: 600000,
    url: baseURL,
  },
});
