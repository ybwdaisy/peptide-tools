import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from '../../src/lib/backup';

const products = [
  { id: 'first', revision: 'r1', name: 'First private label', brand: '', kind: 'single', form: 'powder', amountMg: '5', components: [], identityConfirmed: true, concentrationMgMl: '2', concentrationVerified: true },
  { id: 'second', revision: 'r2', name: 'Second private label', brand: '', kind: 'single', form: 'powder', amountMg: '10', components: [], identityConfirmed: false, concentrationMgMl: '', concentrationVerified: false },
];
const original = JSON.stringify({ version: 2, products, protocols: [] });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, raw }) => {
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied');
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key: STORAGE_KEY, raw: original });
});

test('product selection keeps deep links and confirmation gates without writing records', async ({ page }, info) => {
  await page.goto('/products');
  await expect(page.locator('#product-detail-name')).toHaveText(products[0]!.name);
  await expect(page.locator('#product-calculate-link')).toBeVisible();
  if (info.project.name === 'mobile-webkit') {
    await page.getByLabel('Choose a product', { exact: true }).selectOption('second');
  } else {
    await page.getByRole('link', { name: products[1]!.name, exact: true }).click();
  }
  await expect(page).toHaveURL(/#product=second$/);
  await expect(page.locator('#product-detail-name')).toHaveText(products[1]!.name);
  await expect(page.locator('#product-calculate-disabled')).toBeVisible();
  await expect(page.locator('#product-detail-notice')).toBeVisible();
  await page.locator('[data-language="zh"]').click();
  await expect(page).toHaveURL(/\/zh\/products#product=second$/);
  await expect(page.locator('#product-detail-name')).toHaveText(products[1]!.name);
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  await page.goBack();
  await expect(page.locator('#product-detail-name')).toHaveText(products[1]!.name);
});

test('invalid product deep links never substitute another product or corrupt backup access', async ({ page }) => {
  await page.goto('/products#product=missing');
  await expect(page.locator('#workspace-error')).toContainText('no longer saved');
  await expect(page.locator('#product-detail')).toBeHidden();
  await page.goto('/products#workspace-data-heading');
  await expect(page.locator('.workspace-data')).toHaveAttribute('open', '');
  await expect(page.locator('#workspace-backup-export')).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
});

test('only active selection emits one product-open event and never sends the record identity', async ({ page }, info) => {
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* isolated test, no collection */' }));
  await page.addInitScript(() => {
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'granted');
    addEventListener('beforeunload', () => {
      const current = ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? []).map(args => Array.from(args));
      const old = JSON.parse(sessionStorage.getItem('selection.commands') ?? '[]');
      sessionStorage.setItem('selection.commands', JSON.stringify([...old, ...current]));
    });
  });
  const events = () => page.evaluate(() => {
    const old = JSON.parse(sessionStorage.getItem('selection.commands') ?? '[]');
    const current = ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? []).map(args => Array.from(args));
    return [...old, ...current].filter(command => command[0] === 'event' && command[1] === 'product_opened');
  });
  await page.goto('/products');
  expect(await events()).toHaveLength(0);
  if (info.project.name === 'mobile-webkit') await page.locator('#product-picker').selectOption('second');
  else await page.getByRole('link', { name: products[1]!.name, exact: true }).click();
  await expect(page.locator('#product-detail-name')).toHaveText(products[1]!.name);
  expect(await events()).toHaveLength(1);
  await page.reload();
  const recorded = await events();
  expect(recorded).toHaveLength(1);
  expect(JSON.stringify(recorded)).not.toMatch(/private|first|second|product=|mg|r2/);
});
