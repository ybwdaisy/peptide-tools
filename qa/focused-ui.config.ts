import { defineConfig } from '@playwright/test';
import original from '../playwright.config';

export default defineConfig({
  ...original,
  testDir: '../tests/e2e',
  use: { ...original.use, baseURL: 'http://127.0.0.1:4333' },
  webServer: undefined,
});
