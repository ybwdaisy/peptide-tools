import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STORAGE_KEY } from '../../src/lib/backup';

async function dismissConsent(page: Page) {
  const dismiss = page.getByRole('button', { name: 'No thanks', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
}
async function addSingle(page: Page, name = 'Private label product') {
  await page.goto('/products/new'); await dismissConsent(page);
  await page.getByLabel('Product name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('5');
}
test('unknown label details can be saved while calculations remain locked and schedules retain product context', async ({ page }) => {
  await page.goto('/products'); await dismissConsent(page);
  await expect(page.getByRole('heading', { name: 'Start with a product you already have.' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await addSingle(page);
  await expect(page.getByLabel('Concentration (mg/mL)', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=[\w-]+$/);
  await expect(page.locator('#product-detail-name')).toHaveText('Private label product');
  await expect(page.locator('#product-calculate-disabled')).toBeDisabled();
  await expect(page.locator('#product-detail-facts')).toContainText('5 mg in one vial');
  expect(page.url()).not.toContain('Private');
  await page.getByRole('link', { name: 'Add to my schedule', exact: true }).click();
  await expect(page.locator('[data-field="label"]').first()).toHaveValue('Private label product');
  await expect(page.locator('[data-field="dose"]').first()).toHaveValue('');
  await expect(page.locator('[data-field="time"]').first()).toHaveValue('');
});
test('verified product values carry into the calculator without a prefilled target dose', async ({ page }) => {
  await addSingle(page, 'BPC-157');
  await page.getByLabel(/I checked the exact name and version/).check();
  await page.getByLabel('Concentration (mg/mL)', { exact: true }).fill('2');
  await page.getByLabel(/I independently verified this concentration/).check();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Calculate volume', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#concentration')).toHaveValue('2');
  await expect(page.locator('#dose')).toHaveValue('');
  await page.locator('#dose').fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.125');
});
test('blend amount mismatches are rejected, draft language switching retains all label inputs, and NO DAC is not matched to DAC', async ({ page }) => {
  await page.goto('/products/new'); await dismissConsent(page);
  await page.getByLabel('Product name', { exact: true }).fill('CJC-1295 NO DAC + Ipamorelin');
  await page.getByLabel('Product type', { exact: true }).selectOption('blend');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('10');
  const components = page.locator('[data-component]');
  await components.nth(0).locator('[data-component-name]').fill('CJC-1295 NO DAC');
  await components.nth(0).locator('[data-component-amount]').fill('4');
  await components.nth(1).locator('[data-component-name]').fill('Ipamorelin');
  await components.nth(1).locator('[data-component-amount]').fill('5');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.locator('#product-entry-error')).toContainText('Ingredient amounts must match');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await components.nth(0).locator('[data-component-amount]').fill('5');
  await page.locator('[data-language="zh"]').click();
  await expect(page.locator('#product-label-step')).toBeVisible();
  await expect(page.locator('#product-name')).toHaveValue('CJC-1295 NO DAC + Ipamorelin');
  await expect(page.locator('[data-component]').nth(0).locator('[data-component-name]')).toHaveValue('CJC-1295 NO DAC');
  await expect(page.locator('[data-component]').nth(0).locator('[data-component-amount]')).toHaveValue('5');
  await page.locator('[data-language="en"]').click();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.locator('#product-detail-name')).toHaveText('CJC-1295 NO DAC + Ipamorelin');
  await expect(page.locator('#product-reference-link')).toBeHidden();
  await expect(page.locator('#product-calculate-disabled')).toBeDisabled();
});
test('workspace backup restores products, rejects invalid data without overwriting it, and preserves legacy schedules', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await addSingle(page);
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.locator('.workspace-data > summary').click();
  await page.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  const download = await pending, raw = await readFile((await download.path())!, 'utf8');
  const backup = JSON.parse(raw);
  expect(backup.version).toBe(2); expect(backup.products).toHaveLength(1);
  await page.evaluate(key => localStorage.setItem(key, '{corrupt'), STORAGE_KEY); await page.reload();
  await expect(page.locator('#workspace-error')).toContainText('Nothing has been overwritten');
  await page.locator('.workspace-data > summary').click();
  await page.locator('#workspace-backup-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.locator('#workspace-status')).toContainText('Restore failed');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{corrupt');
  await page.locator('#workspace-backup-import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.locator('#workspace-status')).toHaveText('Products, schedules and calculations restored.');
  await expect(page.locator('#product-detail-name')).toHaveText('Private label product');
  const legacy = { version: 1, protocols: [{ id: 'legacy', name: 'Legacy plan', timeZone: 'UTC', startDate: '2028-02-28', endDate: '2028-03-01', items: [{ id: 'legacy-item', label: 'Original entry', dose: '250', unit: 'mcg', time: '08:00', frequency: { kind: 'daily' } }] }] };
  await page.locator('#workspace-backup-import').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.locator('#product-schedule-list')).toContainText('Legacy plan');
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(restored.protocols).toEqual(legacy.protocols); expect(restored.products).toEqual([]);
});
test('product events count active actions and contain no private label inputs', async ({ page }) => {
  await page.addInitScript(() => addEventListener('beforeunload', () => {
    const layer = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer;
    if (layer) sessionStorage.setItem('test.product-commands', JSON.stringify(layer.map(args => Array.from(args))));
  }));
  await page.route('**/products/new', async route => {
    const response = await route.fetch(); const html = (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"');
    await route.fulfill({ response, body: html });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* no real Google traffic */' }));
  await page.goto('/products/new'); await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Secret product name');
  await page.getByLabel('Brand (optional)', { exact: true }).fill('Secret brand');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('17.321');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  const raw = await page.evaluate(() => sessionStorage.getItem('test.product-commands'));
  expect(raw).not.toMatch(/Secret|17\.321|product=/);
  const commands = JSON.parse(raw!) as unknown[][], events = commands.filter(command => command[0] === 'event');
  expect(events.filter(command => command[1] === 'product_entry_start')).toHaveLength(1);
  expect(events.filter(command => command[1] === 'product_saved')).toHaveLength(1);
});
