import { test, expect, type Page } from '@playwright/test';

async function collect(page: Page) {
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* offline tag contract; never real GA collection */' }));
  await page.addInitScript(() => {
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'granted');
    addEventListener('beforeunload', () => {
      const layer = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? [];
      const saved = JSON.parse(sessionStorage.getItem('test.commands') ?? '[]');
      sessionStorage.setItem('test.commands', JSON.stringify([...saved, ...layer.map(args => Array.from(args))]));
    });
  });
}
async function events(page: Page) {
  return page.evaluate(() => {
    const old = JSON.parse(sessionStorage.getItem('test.commands') ?? '[]') as unknown[][];
    const current = ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? []).map(args => Array.from(args));
    return [...old, ...current].filter(args => args[0] === 'event').map(args => ({ name: args[1], params: args[2] as Record<string, unknown> }));
  });
}

test('product activation counts explicit steps, distinguishes edits, and keeps QA through navigation', async ({ page }) => {
  await collect(page);
  await page.goto('/?analytics_test=1&name=PRIVATE-QUERY');
  await page.getByRole('link', { name: 'Add my first product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('PRIVATE-PRODUCT');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  await page.getByRole('link', { name: 'Edit label and concentration', exact: true }).click();
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('17.321');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  const recorded = await events(page);
  expect(recorded.filter(e => e.name === 'navigation_action').map(e => e.params.action)).toEqual(['add_product', 'edit_product']);
  expect(recorded.filter(e => e.name === 'product_entry_start').map(e => e.params.operation)).toEqual(['create', 'update']);
  expect(recorded.filter(e => e.name === 'product_label_view')).toHaveLength(1);
  expect(recorded.filter(e => e.name === 'product_saved').map(e => e.params.operation)).toEqual(['create', 'update']);
  expect(recorded.every(e => e.params.traffic_class === 'qa' && e.params.page_group === 'qa' && e.params.debug_mode === true)).toBe(true);
  expect(JSON.stringify(recorded)).not.toMatch(/PRIVATE|17\.321|product=|edit=|analytics_test/);
});

test('restoring and switching language do not manufacture a start; tool contexts have independent intent', async ({ page }) => {
  await collect(page);
  await page.goto('/products/new');
  await page.getByLabel('Product name', { exact: true }).fill('PRIVATE-LABEL');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByLabel('Concentration (mg/mL)', { exact: true }).fill('2');
  await page.locator('[name="identityConfirmed"]').check();
  await page.locator('[name="concentrationVerified"]').check();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  const before = await events(page);
  await page.getByRole('link', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#calculator-form')).toBeVisible();
  await page.getByRole('link', { name: '中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await events(page)).filter(e => e.name === 'calculator_start')).toHaveLength(0);
  await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await page.goto('/calculator');
  await page.getByLabel('Concentration', { exact: false }).fill('2');
  await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  const recorded = await events(page);
  expect(recorded.filter(e => e.name === 'calculator_start').map(e => e.params.tool_context)).toEqual(['product', 'standalone']);
  expect(recorded.filter(e => e.name === 'calculation_success').map(e => e.params.tool_context)).toEqual(['product', 'standalone']);
  expect(recorded.filter(e => e.name === 'product_saved')).toHaveLength(before.filter(e => e.name === 'product_saved').length);
  expect(recorded.every(e => e.params.traffic_class === 'public' && !('debug_mode' in e.params))).toBe(true);
});


test('direct local save is a conversion without a generate click and subsequent save is update', async ({ page }) => {
  await collect(page);
  await page.goto('/planner');
  await page.getByLabel('Protocol name', { exact: true }).fill('PRIVATE-SCHEDULE');
  await page.getByLabel('Time zone', { exact: true }).selectOption('UTC');
  await page.getByLabel('Start date (included)').fill('2028-02-28');
  await page.getByLabel('End date (included)').fill('2028-03-01');
  const row = page.locator('.protocol-item').first();
  await row.getByLabel('Item name', { exact: true }).fill('PRIVATE-ITEM');
  await row.getByLabel('Dose entered', { exact: true }).fill('250');
  await row.getByLabel('Local time', { exact: true }).fill('08:00');
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click();
  await expect(page.locator('#planner-status')).toContainText('Saved in this browser');
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click();
  const recorded = await events(page);
  expect(recorded.filter(e => e.name === 'protocol_saved').map(e => e.params.operation)).toEqual(['create', 'update']);
  expect(recorded.filter(e => e.name === 'protocol_saved').every(e => e.params.tool_context === 'standalone')).toBe(true);
  expect(recorded.filter(e => e.name === 'schedule_generated')).toHaveLength(0);
  expect(JSON.stringify(recorded)).not.toMatch(/PRIVATE|250|2028-02/);
});

test('native label validation reports a category without a saved conversion', async ({ page }) => {
  await collect(page);
  await page.goto('/products/new');
  await page.getByLabel('Product name', { exact: true }).fill('PRIVATE');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  const recorded = await events(page);
  expect(recorded.filter(e => e.name === 'product_entry_error').map(e => e.params.error_code)).toEqual(['invalid_label']);
  expect(recorded.filter(e => e.name === 'product_saved')).toHaveLength(0);
  expect(JSON.stringify(recorded)).not.toMatch(/PRIVATE/);
});
