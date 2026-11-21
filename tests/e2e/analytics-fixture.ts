import type { Page } from '@playwright/test';

/** Public-visitor event contracts run offline; never let synthetic events reach Google. */
export async function simulatePublicVisitor(page: Page) {
  await page.route(/google-analytics\.com|googleadservices\.com|doubleclick\.net/, route => route.abort());
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
}
