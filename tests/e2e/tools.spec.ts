import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STORAGE_KEY } from '../../src/lib/backup';

async function dismissConsent(page: Page) { const decline = page.getByRole('button', { name: 'No thanks', exact: true }); if (await decline.isVisible()) await decline.click(); }
async function fillProtocol(page: Page) {
  await page.goto('/planner'); await dismissConsent(page);
  await page.getByLabel('Protocol name', { exact: true }).fill('Private test protocol');
  await page.getByLabel('Time zone', { exact: true }).selectOption('UTC');
  await page.getByLabel('Start date (included)').fill('2028-02-28');
  await page.getByLabel('End date (included)').fill('2028-03-01');
  const row = page.locator('.protocol-item').first();
  await row.getByLabel('Item name', { exact: true }).fill('Private user entry');
  await row.getByLabel('Dose entered', { exact: true }).fill('250');
  await row.getByLabel('Local time', { exact: true }).fill('08:00');
}
test('calculator handles success, units, error and device graduations', async ({ page }) => {
  await page.goto('/calculator'); await dismissConsent(page);
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#calculator-error')).toContainText('greater than zero');
  await page.getByLabel('Concentration', { exact: false }).fill('5');
  await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.05');
  await page.getByLabel('Show a U-100 syringe scale').check();
  await expect(page.locator('#calculator-result')).toBeHidden();
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#markings-value')).toHaveText('5');
  await page.getByLabel('Target dose', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#graduation-note')).toBeVisible();
  await page.getByLabel('Target dose', { exact: true }).fill('9999');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#calculator-error')).toContainText('exceeds');
});
test('planner generates, saves, reloads, exports and restores a complete protocol', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await fillProtocol(page);
  await page.getByRole('button', { name: 'Generate calendar', exact: true }).click();
  await expect(page.locator('#calendar-summary')).toContainText('3 entries');
  await expect(page.locator('#schedule-rows tr')).toHaveCount(3);
  await expect(page.locator('#schedule-rows td:nth-child(3)').first()).toBeVisible();
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  await expect(page.locator('#planner-status')).toContainText('Saved in this browser');
  const backupDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  const backup = await backupDownload; const backupPath = await backup.path(); expect(backupPath).toBeTruthy();
  const json = JSON.parse(await readFile(backupPath!, 'utf8')); expect(json.protocols[0].items[0].dose).toBe('250');
  const calendarDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export calendar (.ics)', exact: true }).click();
  const calendar = await calendarDownload; const ics = await readFile((await calendar.path())!, 'utf8');
  expect(ics).toContain('DTSTART:20280228T080000Z'); expect(ics).not.toContain('VALARM'); expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  await page.reload(); await page.getByRole('button', { name: 'Private test protocol', exact: true }).click();
  await expect(page.getByLabel('Protocol name', { exact: true })).toHaveValue('Private test protocol');
  await expect(page.locator('#calendar-summary')).toContainText('3 entries');
  await page.getByRole('button', { name: 'Clear saved protocols', exact: true }).click();
  await expect(page.locator('#saved-empty')).toBeVisible();
  await page.getByLabel('Restore a JSON backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.locator('#storage-status')).toContainText('Products, schedules and calculations restored.');
  await expect(page.getByRole('button', { name: 'Private test protocol', exact: true })).toBeVisible();
});
test('multi-item schedule respects alternate-day rules and invalidates stale exports', async ({ page }) => {
  await fillProtocol(page); await page.getByRole('button', { name: 'Add schedule item', exact: true }).click();
  const second = page.locator('.protocol-item').nth(1);
  await second.getByLabel('Item name', { exact: true }).fill('Second private entry');
  await second.getByLabel('Dose entered', { exact: true }).fill('1');
  await second.getByLabel('Local time', { exact: true }).fill('20:00');
  await second.getByLabel('Repeat', { exact: true }).selectOption('alternate');
  await page.getByRole('button', { name: 'Generate calendar', exact: true }).click();
  await expect(page.locator('#calendar-summary')).toContainText('5 entries');
  await second.getByLabel('Dose entered', { exact: true }).fill('2');
  await expect(page.locator('#generated-calendar')).toBeHidden();
});
test('unavailable local storage shows an error without claiming a successful save', async ({ page }) => {
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.includes('protocols')) throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await fillProtocol(page); await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  await expect(page.locator('#planner-error')).toContainText('unavailable or full');
  await expect(page.locator('#saved-empty')).toBeVisible();
});
test('invalid restore preserves existing stored data', async ({ page }) => {
  await fillProtocol(page); await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await page.getByLabel('Restore a JSON backup', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2,"protocols":[]}') });
  await expect(page.locator('#storage-status')).toContainText('Restore failed');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
});
test('corrupt existing storage is not overwritten by a new save', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{corrupt'), STORAGE_KEY);
  await fillProtocol(page); await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  await expect(page.locator('#planner-error')).toContainText('Nothing has been overwritten');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{corrupt');
});
test('library filters locally without adding search terms to the URL', async ({ page }) => {
  await page.goto('/library'); await dismissConsent(page);
  await page.getByLabel('Find a name or alias').fill('Epithalon');
  await expect(page.locator('[data-reference]:visible')).toHaveCount(1);
  expect(page.url()).not.toContain('Epithalon');
  await page.getByRole('link', { name: /Epitalon/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Epitalon');
  await expect(page.getByRole('heading', { name: 'Sources and review method' })).toBeVisible();
});
test('references stay readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }); const page = await context.newPage();
  await page.goto('/library/cjc-1295'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('CJC-1295 DAC');
  await expect(page.locator('body')).toContainText('5.8–8.1 days'); await context.close();
});
test('declining consent makes no analytics requests and preview cannot enable collection', async ({ page }) => {
  const analytics: string[] = []; page.on('request', request => { if (/google-analytics|googletagmanager/.test(request.url())) analytics.push(request.url()); });
  await page.goto('/calculator?analytics_test=1'); await expect(page.locator('#analytics-choice')).toBeVisible();
  expect(analytics).toEqual([]); await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await page.getByLabel('Concentration', { exact: false }).fill('5'); await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click(); await expect(page.locator('#result-volume')).toHaveText('0.05');
  await page.getByRole('button', { name: 'Analytics preferences', exact: true }).click(); await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  expect(analytics).toEqual([]);
});
test('consented event contract sends only allowlisted data and withdrawal stops the tag', async ({ page }) => {
  await page.route('**/calculator?**', async route => {
    const response = await route.fetch(); const html = (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"');
    await route.fulfill({ response, body: html });
  });
  const analytics: string[] = [];
  await page.route('https://www.googletagmanager.com/**', async route => { analytics.push(route.request().url()); await route.fulfill({ contentType: 'application/javascript', body: '/* stub: no real Google collection in automated tests */' }); });
  await page.goto('/calculator?utm_source=reddit&utm_medium=social&utm_campaign=private-name&dose=private-dose');
  expect(analytics).toHaveLength(0);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect.poll(() => analytics.length).toBe(1);
  await page.getByLabel('Concentration', { exact: false }).fill('5'); await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  const commands = await page.evaluate(() => ((window as unknown as { dataLayer: Array<ArrayLike<unknown>> }).dataLayer).map(args => Array.from(args)));
  const events = commands.filter(args => args[0] === 'event');
  expect(events.filter(args => args[1] === 'page_view')).toHaveLength(1);
  expect(events.filter(args => args[1] === 'calculator_start')).toHaveLength(1);
  expect(events.filter(args => args[1] === 'calculation_success')).toHaveLength(2);
  expect(JSON.stringify(commands)).not.toMatch(/private-name|private-dose|"250"|concentration/);
  const defaultsIndex = commands.findIndex(args => args[0] === 'set');
  expect(defaultsIndex).toBeGreaterThan(-1);
  expect(defaultsIndex).toBeLessThan(commands.findIndex(args => args[0] === 'js'));
  expect(commands[defaultsIndex]?.[1]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: 'https://peptides.ybwdaisy.com/calculator', page_title: 'Peptide Tools: calculator' });
  expect(commands.find(args => args[0] === 'config')?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, page_location: 'https://peptides.ybwdaisy.com/calculator', campaign_source: 'reddit' });
  await page.getByRole('button', { name: 'Analytics preferences', exact: true }).click();
  await page.getByRole('button', { name: 'No thanks', exact: true }).click();
  await expect(page.locator('#analytics-status')).toHaveText('Optional analytics: off.');
  expect(analytics).toHaveLength(1);
});
test('an accidentally production-marked alias cannot load analytics outside the approved origin', async ({ page }) => {
  await page.route('**/calculator', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  const requests: string[] = [];
  page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url()); });
  await page.goto('/calculator'); await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.getByLabel('Concentration', { exact: false }).fill('5'); await page.getByLabel('Target dose', { exact: true }).fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.05');
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
});
test('all main routes render without overflow or uncaught application errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/calculator', '/library', '/library/tb-500', '/planner', '/privacy', '/disclaimer']) {
    const response = await page.goto(path); expect(response?.ok()).toBe(true); await dismissConsent(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const missing = await page.goto('/does-not-exist'); expect(missing?.status()).toBe(404);
  expect(errors).toEqual([]);
});

test('planner analytics records successful actions once and never sends restored inputs', async ({ page }) => {
  await page.route('**/planner', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* no real collection */' }));
  await fillProtocol(page);
  await page.getByRole('button', { name: 'Analytics preferences', exact: true }).click(); await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.getByRole('button', { name: 'Generate calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Save in this browser', exact: true }).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  await page.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  await page.getByRole('button', { name: 'Export calendar (.ics)', exact: true }).click();
  await page.evaluate(() => { window.print = () => {}; }); await page.getByRole('button', { name: 'Print cycle', exact: true }).click();
  await page.getByRole('button', { name: 'Private test protocol', exact: true }).click();
  const commands = await page.evaluate(() => ((window as unknown as { dataLayer: Array<ArrayLike<unknown>> }).dataLayer).map(args => Array.from(args)));
  const events = commands.filter(args => args[0] === 'event');
  for (const name of ['planner_start','schedule_generated','protocol_saved','print_requested']) expect(events.filter(args => args[1] === name)).toHaveLength(1);
  expect(events.filter(args => args[1] === 'export_completed')).toHaveLength(2);
  expect(JSON.stringify(commands)).not.toMatch(/Private test protocol|Private user entry|250|2028-02/);
});
