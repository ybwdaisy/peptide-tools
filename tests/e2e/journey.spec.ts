import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from '../../src/lib/backup';

const blend = { id: 'blend-example', revision: 'first-label', name: 'Private CJC-1295 NO DAC + Ipamorelin', brand: '', kind: 'blend', form: 'powder', amountMg: '10', components: [{ name: 'CJC-1295 NO DAC', amountMg: '5' }, { name: 'Ipamorelin', amountMg: '5' }], identityConfirmed: true, concentrationMgMl: '5', concentrationVerified: true };
test('a blend calculation has an explicit component basis and carries only confirmed inputs into a new plan', async ({ page }) => {
  await page.addInitScript(({ key, product }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, products: [product], protocols: [] }));
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied');
  }, { key: STORAGE_KEY, product: blend });
  await page.goto('/calculator#product=blend-example');
  await expect(page.locator('#calculation-basis')).toHaveValue('');
  await page.locator('#dose').fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#calculator-error')).toContainText('Choose the ingredient');
  await page.locator('#calculation-basis').selectOption('0');
  await expect(page.locator('#concentration')).toHaveValue('2.5');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.1');
  await expect(page.locator('#blend-amounts')).toContainText('CJC-1295 NO DAC: 0.25 mg');
  await expect(page.locator('#blend-amounts')).toContainText('Ipamorelin: 0.25 mg');
  await page.getByRole('link', { name: 'Use in my schedule', exact: true }).click();
  const row = page.locator('.protocol-item').first();
  await expect(row.locator('[data-field="label"]')).toHaveValue(blend.name);
  await expect(row.locator('[data-field="dose"]')).toHaveValue('250');
  await expect(row.locator('[data-field="doseBasis"]')).toHaveValue('0');
  await expect(row.locator('[data-field="frequency"]')).toHaveValue('');
  await expect(row.locator('[data-field="time"]')).toHaveValue('');
  await expect(page.locator('#start-date')).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('peptide-tools.calculation-draft.v1'))).toBeNull();
  await page.locator('#protocol-name').fill('My existing plan');
  await page.locator('#time-zone').selectOption('UTC');
  await page.locator('#start-date').fill('2028-02-28'); await page.locator('#end-date').fill('2028-03-01');
  await row.locator('[data-field="time"]').fill('08:00'); await row.locator('[data-field="frequency"]').selectOption('daily');
  await page.getByRole('button', { name: 'Generate calendar', exact: true }).click();
  await expect(page.locator('#agenda-entries')).toContainText(blend.name);
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click();
  const schedule = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).protocols[0], STORAGE_KEY);
  expect(schedule.items[0].product.amountMg).toBe('10'); expect(schedule.items[0].doseBasis).toBe('0');
  // A later label change does not silently replace the schedule snapshot.
  await page.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)!); data.products[0].amountMg = '20'; data.products[0].components.forEach((c: { amountMg: string }) => c.amountMg = '10'); data.products[0].revision = 'new-label'; localStorage.setItem(key, JSON.stringify(data)); }, STORAGE_KEY);
  await page.goto(`/planner#protocol=${schedule.id}`);
  await expect(row.locator('[data-product-summary]')).toContainText('10 mg');
  await expect(row.locator('[data-product-warning]')).toContainText('earlier product label');
  await expect(page.locator('#generated-calendar')).toBeVisible();
  await page.locator('#agenda-date').fill('2028-02-29'); await page.locator('#agenda-date').dispatchEvent('change');
  await expect(page.locator('#agenda-entries')).toContainText('250 mcg');
  await expect(page.locator('#agenda-week [aria-pressed="true"]')).toContainText('29');
  await page.locator('[data-language="zh"]').click();
  await expect(row.locator('[data-field="doseBasis"]')).toHaveValue('0');
  await expect(row.locator('[data-product-warning]')).not.toBeEmpty();
  await expect(row.locator('[data-product-summary]')).toContainText('10 mg');
});

test('a changed product invalidates a carried calculation and stored write failures never claim success', async ({ page }) => {
  await page.addInitScript(({ key, product }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, products: [product], protocols: [] }));
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied');
  }, { key: STORAGE_KEY, product: blend });
  await page.goto('/planner#product=blend-example');
  await page.evaluate(() => sessionStorage.setItem('peptide-tools.calculation-draft.v1', JSON.stringify({ productId: 'blend-example', revision: 'outdated-label', dose: '999', unit: 'mg', basis: '0', expires: Date.now() + 10000 })));
  await page.reload();
  await expect(page.locator('[data-field="dose"]')).toHaveValue('');
  await page.goto('/products/new');
  await page.locator('#product-name').fill('My entered product'); await page.locator('#product-continue').click();
  await page.locator('#product-form-type').selectOption('powder'); await page.locator('#product-amount').fill('5');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Unavailable', 'QuotaExceededError'); }; });
  await page.locator('#product-save').click();
  await expect(page.locator('#product-entry-status')).toContainText('Nothing was saved');
  await expect(page.locator('#product-amount')).toHaveValue('5'); expect(page.url()).toContain('/products/new');
});

test('deep links preserve valid legacy time-zone aliases when opening and resaving schedules', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied');
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, protocols: [{ id: 'legacy', name: 'Earlier plan', timeZone: 'Etc/GMT+5', startDate: '2028-02-29', endDate: '2028-02-29', items: [{ id: 'old-item', label: 'My product', dose: '1', unit: 'mg', time: '08:00', frequency: { kind: 'daily' } }] }] }));
  }, STORAGE_KEY);
  await page.goto('/planner#protocol=legacy');
  await expect(page.locator('#time-zone')).toHaveValue('Etc/GMT+5');
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click();
  await expect(page.locator('#planner-status')).toContainText('Saved in this browser');
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(data.protocols[0].timeZone).toBe('Etc/GMT+5');
});
