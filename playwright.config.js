import { defineConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const temporaryDirectory = fileURLToPath(new URL('./node_modules/.cache/playwright-temp/', import.meta.url));
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;
process.env.TMPDIR = temporaryDirectory;

const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalServer || 'http://127.0.0.1:18773';
const address = new URL(baseURL);
if (address.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname)) {
  throw new Error('PLAYWRIGHT_BASE_URL must point to a local HTTP server.');
}

const requestedChannel = process.env.PLAYWRIGHT_CHANNEL;
const channel = requestedChannel === 'chromium'
  ? undefined
  : requestedChannel || (process.platform === 'win32' ? 'chrome' : undefined);

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.spec.js',
  timeout: 60000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || './node_modules/.cache/playwright-results',
  reporter: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE
    ? [['list'], ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE }]]
    : 'list',
  use: {
    browserName: 'chromium',
    channel,
    baseURL,
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: externalServer ? undefined : {
    command: `${process.platform === 'win32' ? 'python' : 'python3'} tests/serve.py`,
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: `${baseURL}/index.html`,
    reuseExistingServer: false,
    timeout: 20000,
  },
});
