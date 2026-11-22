import { test, expect, type Page } from '@playwright/test';

async function collect(page: Page, human = true) {
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* offline tag contract; never real GA collection */' }));
  await page.route(/google-analytics\.com|googleadservices\.com|doubleclick\.net/, route => route.abort());
  await page.addInitScript((human) => {
    // Simulate a normal visitor only in this fully intercepted SDK contract fixture.
    if (human) Object.defineProperty(navigator, 'webdriver', { get: () => false });
    localStorage.setItem('peptide-tools.analytics-consent.v1', 'granted');
    addEventListener('beforeunload', () => {
      const layer = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? [];
      const saved = JSON.parse(sessionStorage.getItem('test.commands') ?? '[]');
      sessionStorage.setItem('test.commands', JSON.stringify([...saved, ...layer.map(args => Array.from(args))]));
    });
  }, human);
}
async function events(page: Page) {
  return page.evaluate(() => {
    const old = JSON.parse(sessionStorage.getItem('test.commands') ?? '[]') as unknown[][];
    const current = ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? []).map(args => Array.from(args));
    return [...old, ...current].filter(args => args[0] === 'event').map(args => ({ name: args[1], params: args[2] as Record<string, unknown> }));
  });
}

test('product activation counts explicit steps, distinguishes edits, and preserves public event taxonomy through navigation', async ({ page }) => {
  await collect(page);
  await page.goto('/?name=PRIVATE-QUERY');
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
  expect(recorded.every(e => e.params.traffic_class === 'public' && e.params.debug_mode === undefined)).toBe(true);
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
  await expect.poll(async () => (await events(page)).filter(event => event.name === 'calculation_success' && event.params.tool_context === 'product').length).toBe(1);
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
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  await expect(page.locator('#planner-status')).toContainText('Saved in this browser');
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
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

test('navigation waits for delayed SDK processing and duplicate callbacks cannot duplicate saves', async ({ page }) => {
  await collect(page);
  const received: Array<{ name: string; params: Record<string, unknown> }> = [];
  await page.route('https://measurement.invalid/collect', async route => {
    received.push(JSON.parse(route.request().postData()!));
    await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    const layer = window.dataLayer;
    function process(args) {
      if (args[0] !== 'event') return;
      setTimeout(async () => {
        await fetch('https://measurement.invalid/collect', { method: 'POST', body: JSON.stringify({ name: args[1], params: args[2] }) });
        args[2].event_callback?.();
        args[2].event_callback?.();
      }, 100);
    }
    const push = layer.push.bind(layer);
    layer.push = (...commands) => { commands.forEach(process); return push(...commands); };
    layer.forEach(process);
  ` }));
  await page.goto('/');
  await page.getByRole('link', { name: 'Add my first product', exact: true }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  expect(received.filter(e => e.name === 'navigation_action' && e.params.action === 'add_product')).toHaveLength(1);
  await page.getByLabel('Product name', { exact: true }).fill('PRIVATE-FAST-SAVE');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  expect(received.filter(e => e.name === 'product_saved')).toHaveLength(1);
  await page.getByRole('link', { name: 'Edit label and concentration', exact: true }).click();
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('17.321');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  expect(received.filter(e => e.name === 'product_entry_start').map(e => e.params.operation)).toEqual(['create', 'update']);
  expect(received.filter(e => e.name === 'product_saved').map(e => e.params.operation)).toEqual(['create', 'update']);
  expect(received.filter(e => e.name === 'product_saved').every(e => e.params.page_location === 'https://peptides.ybwdaisy.com/products/new')).toBe(true);
  expect(JSON.stringify(received)).not.toMatch(/PRIVATE|17\.321|product=|edit=|analytics_test/);
});


test('explicit QA stays uncollected after consent, product navigation and a full reload', async ({ page }) => {
  await collect(page);
  const tags: string[] = [];
  page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) tags.push(request.url()); });
  await page.goto('/?analytics_test=1');
  await page.getByRole('link', { name: 'Add my first product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('QA-LOCAL-ONLY');
  await page.getByRole('button', { name: 'Continue to label', exact: true }).click();
  await page.getByLabel('Form on the label', { exact: true }).selectOption('powder');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products#product=/);
  await page.reload();
  expect(await events(page)).toEqual([]);
  expect(tags).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('peptide-tools.analytics-qa.v1'))).toBe('1');
});


test('webdriver automation stays uncollected even with a reset flag and granted consent', async ({ page }) => {
  await collect(page, false);
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => true }));
  const requests: string[] = [];
  page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url()); });
  await page.goto('/?analytics_test=0');
  await page.getByRole('link', { name: 'Add my first product', exact: true }).click();
  await page.reload();
  expect(await events(page)).toEqual([]);
  expect(requests).toEqual([]);
});

for (const flag of ['analytics_test', 'qa']) {
  test(`${flag} is captured before consent, survives a new tab and resets only inside the offline fixture`, async ({ page, context }) => {
    await collect(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('test.consent-accepted') !== '1') localStorage.removeItem('peptide-tools.analytics-consent.v1');
    });
    const requests: string[] = [];
    page.on('request', request => { if (/googletagmanager|google-analytics|googleadservices|doubleclick/.test(request.url())) requests.push(request.url()); });
    await page.goto(`/?${flag}=1`);
    await expect(page.locator('#analytics-choice')).toBeVisible();
    expect(await page.evaluate(() => [sessionStorage.getItem('peptide-tools.analytics-qa.v1'), localStorage.getItem('peptide-tools.analytics-qa.v1')])).toEqual(['1', '1']);
    // Navigate before the consent choice; the destination has no query flag.
    await page.locator('header').getByRole('link', { name: 'Calculator', exact: true }).click();
    await expect(page).toHaveURL(/\/calculator$/);
    await expect(page.locator('#analytics-choice')).toBeVisible();
    await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
    await page.evaluate(() => sessionStorage.setItem('test.consent-accepted', '1'));
    await expect(page.locator('script[data-analytics="ga4"]')).toHaveCount(0);
    expect(await events(page)).toEqual([]);
    expect(requests).toEqual([]);

    const second = await context.newPage();
    // Every simulated human tab has transport interception before navigation.
    await collect(second);
    const secondRequests: string[] = [];
    second.on('request', request => { if (/googletagmanager|google-analytics|googleadservices|doubleclick/.test(request.url())) secondRequests.push(request.url()); });
    await second.goto('/today');
    await expect(second.locator('script[data-analytics="ga4"]')).toHaveCount(0);
    expect(await second.evaluate(() => [sessionStorage.getItem('peptide-tools.analytics-qa.v1'), localStorage.getItem('peptide-tools.analytics-qa.v1')])).toEqual(['1', '1']);
    expect(await events(second)).toEqual([]);
    expect(secondRequests).toEqual([]);
    await second.close();

    // Reset is exercised with the stub SDK and blocked collection, never Google.
    await page.goto(`/?${flag}=0`);
    await expect(page.locator('script[data-analytics="ga4"]')).toHaveCount(1);
    expect(await page.evaluate(() => [sessionStorage.getItem('peptide-tools.analytics-qa.v1'), localStorage.getItem('peptide-tools.analytics-qa.v1')])).toEqual([null, null]);
    const publicEvents = await events(page);
    expect(publicEvents.filter(event => event.name === 'page_view')).toHaveLength(1);
    expect(publicEvents.every(event => event.params.traffic_class === 'public')).toBe(true);
    expect(requests.every(url => url.startsWith('https://www.googletagmanager.com/gtag/js?'))).toBe(true);
  });
}
