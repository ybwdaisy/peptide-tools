import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ context }) => {
  await context.route(/googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|\/(?:g\/)?collect(?:[/?]|$)|\/(?:beacon|batch|unload)(?:[/?]|$)/, route => route.abort());
});
for (const prefix of ['', '/zh']) {
  test(`visible ${prefix || 'English'} unit references link to arithmetic without entering a dose`, async ({ page }, info) => {
    await page.goto(`${prefix || '/'}?analytics_test=1`);
    const links = page.locator('.unit-links');
    await expect(links.locator('a')).toHaveCount(3);
    await links.locator('a').first().click();
    await expect(page.locator('#mg-mcg')).toBeInViewport();
    await expect(page.locator('#dose')).toHaveValue('');
    await expect(page.locator('#concentration')).toHaveValue('');
    await expect(page.locator('#mg-per-ml')).toContainText('0.25 mg ÷ 2 mg/mL = 0.125 mL');
    await expect(page.locator('#u100-volume')).toContainText('IU');
    await page.locator('.unit-guide a[href="#calculator-form"]').click();
    await expect(page.locator('#concentration')).toBeInViewport();
    await page.locator('#concentration').fill('2');
    await page.locator('#dose').fill('250');
    await page.locator('#use-syringe').check();
    await page.locator('#increment').selectOption('0.5');
    await page.locator('#calculator-form button[type=submit]').click();
    await expect(page.locator('#result-volume')).toHaveText('0.125');
    await expect(page.locator('#markings-value')).toHaveText('12.5');
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const decline = page.locator('[data-consent="denied"]');
    if (await decline.isVisible()) await decline.click();
    await page.locator('#mg-mcg').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `qa/screenshots/seo-2026-11-23/${info.project.name}-${prefix ? 'zh' : 'en'}-guide.png`, fullPage: true });
    await page.goto(`${prefix}/library?analytics_test=1`);
    await expect(page.locator('.unit-links a')).toHaveCount(3);
    await page.locator('.unit-links a').last().click();
    await expect(page.locator('#u100-volume')).toBeInViewport();
    await expect(page.locator('#dose')).toHaveValue('');
  });
}
