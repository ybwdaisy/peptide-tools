import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from '../../src/lib/backup';
const product = { id: 'p1', revision: 'r1', name: 'Private product', brand: '', kind: 'single', form: 'solution', amountMg: '5', components: [], identityConfirmed: true, concentrationMgMl: '2', concentrationVerified: true };
const setup = { id: 'c1', name: 'Private saved calculation', mode: 'known', concentration: '2', vialAmount: '', finalVolume: '', dose: '250', unit: 'mcg', useSyringe: false, capacity: '1', increment: '1', basis: '' };
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied')); });

test('label input uses final volume, restores manual mode, saves and reopens without auto-calculating', async ({ page }, info) => {
  await page.goto('/calculator');
  await page.locator('#concentration').fill('2');
  await page.getByLabel('Input method', { exact: true }).selectOption('label');
  await expect(page.locator('#calculator-source-vial-amount')).toHaveValue('');
  await page.getByLabel('Amount in one vial (mg)', { exact: true }).fill('10');
  await page.getByLabel('Confirmed final volume (mL)', { exact: true }).fill('2');
  await expect(page.locator('#concentration')).toHaveValue('5'); await expect(page.locator('#concentration')).toHaveJSProperty('readOnly', true);
  await page.getByLabel('Input method', { exact: true }).selectOption('known'); await expect(page.locator('#concentration')).toHaveValue('2');
  await page.getByLabel('Input method', { exact: true }).selectOption('label'); await expect(page.locator('#concentration')).toHaveValue('5');
  await page.locator('#dose').fill('250'); await page.locator('#use-syringe').check();
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.05'); await expect(page.locator('#markings-value')).toHaveText('5');
  await page.getByLabel('Calculation name', { exact: true }).fill('My saved label');
  await page.getByRole('button', { name: 'Save calculation', exact: true }).click();
  await expect(page.locator('#calculation-storage-status')).toHaveText('Calculation saved in this browser.');
  await page.getByRole('link', { name: 'My saved label', exact: true }).click();
  await expect(page.locator('#calculator-result')).toBeHidden(); await expect(page.locator('#dose')).toHaveValue('250');
  await expect(page.getByLabel('Input method', { exact: true })).toHaveValue('label');
  await page.locator('[data-language="zh"]').click();
  await expect(page.locator('#calculator-source-final-volume')).toHaveValue('2'); await expect(page.locator('#dose')).toHaveValue('250');
  await page.getByRole('button', { name: '计算体积', exact: true }).click(); await expect(page.locator('#result-volume')).toHaveText('0.05');
  await page.screenshot({ path: info.outputPath('label-calculation.png'), fullPage: true });
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY); expect(data.version).toBe(3); expect(data.calculations).toHaveLength(1);
  await page.locator('[data-language="en"]').click();
  await page.getByLabel('Input method', { exact: true }).selectOption('known');
  await expect(page.locator('#calculator-source-final-volume')).toBeDisabled(); await expect(page.locator('#calculator-result')).toBeHidden();
});

test('product label calculation keeps confirmation explicit and invalidates it on source edits', async ({ page }) => {
  await page.goto('/products/new'); await page.locator('#product-name').fill('Own label'); await page.locator('#product-continue').click();
  await page.locator('#product-form-type').selectOption('powder'); await page.locator('#product-amount').fill('5');
  await page.getByLabel('Input method', { exact: true }).selectOption('label');
  await page.getByLabel('Confirmed final volume (mL)', { exact: true }).fill('2.5');
  await expect(page.locator('#product-concentration')).toHaveValue('2'); await expect(page.locator('#product-concentration-verified')).not.toBeChecked();
  await page.locator('#product-identity').check(); await page.locator('#product-concentration-verified').check();
  await page.getByLabel('Confirmed final volume (mL)', { exact: true }).fill('5');
  await expect(page.locator('#product-concentration-verified')).not.toBeChecked();
  await page.locator('#product-save').click(); await expect(page.locator('#product-calculate-disabled')).toBeVisible();
  await page.locator('#product-edit-link').click(); await expect(page.locator('#product-source-final-volume')).toHaveValue('5');
  await page.locator('#product-concentration-verified').check(); await page.locator('#product-save').click();
  await expect(page.locator('#product-calculate-link')).toBeVisible();
});

test('a changed product requires review before reusing a saved setup, then updates the same record', async ({ page }) => {
  await page.addInitScript(({ key, p, c }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 3, products: [{ ...p, revision: 'r2', concentrationMgMl: '5' }], protocols: [], calculations: [{ ...c, productId: 'p1', productRevision: 'r1' }] })); }, { key: STORAGE_KEY, p: product, c: setup });
  await page.goto('/calculator#calculation=c1');
  await expect(page.locator('#concentration')).toHaveValue('5'); await expect(page.locator('#calculation-review')).toBeVisible();
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click(); await expect(page.locator('#calculator-error')).toContainText('Check the updated product');
  await page.locator('#confirm-updated-product').check(); await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await expect(page.locator('#result-volume')).toHaveText('0.05');
  await page.getByRole('button', { name: 'Save calculation', exact: true }).dblclick();
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY); expect(data.calculations).toHaveLength(1); expect(data.calculations[0].productRevision).toBe('r2');
});

test('calculation-only data can be backed up; preview and cancellation never replace records', async ({ page }, info) => {
  await page.addInitScript(({ key, c }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 3, products: [], protocols: [], calculations: [c] })); }, { key: STORAGE_KEY, c: setup });
  await page.goto('/products#workspace-data-heading'); page.on('dialog', dialog => dialog.accept());
  await expect(page.locator('#workspace-backup-export')).toBeEnabled();
  const download = page.waitForEvent('download'); await page.locator('#workspace-backup-export').click(); await download;
  await expect(page.locator('[data-backup-state]')).toContainText('Backup download requested:');
  const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const file = { name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, protocols: [] })) };
  await page.locator('#workspace-backup-import').setInputFiles(file);
  await expect(page.locator('[data-restore-preview]')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
  await page.getByRole('button', { name: 'Cancel restore', exact: true }).click(); expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
  await page.locator('#workspace-backup-import').setInputFiles(file);
  await page.screenshot({ path: info.outputPath('restore-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click(); await expect(page.locator('#workspace-status')).toContainText('restored');
  await page.goto('/calculator'); await expect(page.locator('#saved-calculations')).toBeHidden();
});

test('unreadable workspace and unavailable writes never overwrite data or claim a save', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{unreadable'), STORAGE_KEY);
  await page.goto('/calculator'); await page.locator('#concentration').fill('2'); await page.locator('#dose').fill('250');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click(); await expect(page.locator('#result-volume')).toHaveText('0.125');
  await page.getByLabel('Calculation name', { exact: true }).fill('Own calculation'); await page.getByRole('button', { name: 'Save calculation', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{unreadable'); await expect(page.locator('#calculation-storage-status')).not.toHaveText('Calculation saved in this browser.');
});


test('save and same-page reuse events carry only enums, with no automatic reuse on refresh', async ({ page }) => {
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-analytics-enabled="false"', 'data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"', `data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/, 'data-ga-id="G-TEST123"') });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '/* no real GA collection */' }));
  await page.addInitScript(() => {
    addEventListener('beforeunload', () => {
      const layer = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? [];
      const old = JSON.parse(sessionStorage.getItem('workflow.commands') ?? '[]');
      sessionStorage.setItem('workflow.commands', JSON.stringify([...old, ...layer.map(args => Array.from(args))]));
    });
  });
  await page.goto('/calculator');
  await page.getByRole('button', { name: 'Analytics preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.locator('#concentration').fill('7.123'); await page.locator('#dose').fill('321.123');
  await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
  await page.getByLabel('Calculation name', { exact: true }).fill('SECRET-SETUP');
  await page.getByRole('button', { name: 'Save calculation', exact: true }).click();
  await page.getByRole('link', { name: 'SECRET-SETUP', exact: true }).click();
  await expect(page.locator('#calculator-result')).toBeHidden();
  await page.reload();
  const events = await page.evaluate(() => {
    const old = JSON.parse(sessionStorage.getItem('workflow.commands') ?? '[]');
    const layer = ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? []).map(args => Array.from(args));
    return [...old, ...layer].filter(args => args[0] === 'event');
  });
  expect(events.filter(e => e[1] === 'calculation_saved')).toHaveLength(1);
  expect(events.filter(e => e[1] === 'calculation_reused')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toMatch(/SECRET|7\.123|321\.123|calculation=/);
});


test('broken backup metadata does not block export, and edits make the last request stale', async ({ page }) => {
  await page.addInitScript(({ key, c }) => { if (!localStorage.getItem(key)) { localStorage.setItem(key, JSON.stringify({ version: 3, products: [], protocols: [], calculations: [c] })); localStorage.setItem('peptide-tools.backup-request.v1', '{broken'); } }, { key: STORAGE_KEY, c: setup });
  await page.goto('/products#workspace-data-heading'); await expect(page.locator('#workspace-backup-export')).toBeEnabled();
  const download = page.waitForEvent('download'); await page.locator('#workspace-backup-export').click(); await download;
  await expect(page.locator('[data-backup-state]')).toContainText('Backup download requested:');
  await page.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)!); data.calculations[0].dose = '500'; localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('storage')); }, STORAGE_KEY);
  await expect(page.locator('[data-backup-state]')).toContainText('Local data changed since that request.');
  await page.locator('#workspace-backup-import').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,protocols:[]}))});
  await expect(page.locator('[data-restore-preview]')).toBeVisible();
  await page.locator('#workspace-backup-import').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(page.locator('[data-restore-preview]')).toBeHidden();
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY); expect(data.calculations[0].dose).toBe('500');
});


test('a revised blend never silently reuses an ingredient index from the old label', async ({ page }) => {
  await page.addInitScript(({key,p,c})=>localStorage.setItem(key,JSON.stringify({version:3,products:[{...p,kind:'blend',revision:'r2',amountMg:'10',concentrationMgMl:'5',components:[{name:'New first component',amountMg:'5'},{name:'Other component',amountMg:'5'}]}],protocols:[],calculations:[{...c,basis:'0',productId:'p1',productRevision:'r1'}]})),{key:STORAGE_KEY,p:product,c:setup});
  await page.goto('/calculator#calculation=c1');await expect(page.locator('#calculation-basis')).toHaveValue('');
  await page.locator('#confirm-updated-product').check();await page.getByRole('button',{name:'Calculate volume',exact:true}).click();
  await expect(page.locator('#calculator-error')).toContainText('Choose the ingredient');
  await page.locator('#calculation-basis').selectOption('0');await page.getByRole('button',{name:'Calculate volume',exact:true}).click();await expect(page.locator('#result-volume')).toHaveText('0.1');
});


test('failed modules cannot submit calculator, label or planner inputs through a native GET', async ({ page }) => {
  const leakedKeys: string[][] = [];
  await page.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'script') return route.abort();
    if (request.resourceType() === 'document' && new URL(request.url()).search) { leakedKeys.push([...new URL(request.url()).searchParams.keys()]); return route.abort(); }
    return route.continue();
  });
  for (const [path, field] of [['/calculator', '#dose'], ['/products/new', '#product-name'], ['/planner', '#protocol-name']] as const) {
    await page.goto(path); await page.locator(field).fill('123');
    for (const button of await page.locator('form button[type="submit"]').all()) await expect(button).toBeDisabled();
    await page.locator(field).press('Enter'); await expect(page).toHaveURL(new RegExp(path+'$'));
  }
  expect(leakedKeys).toEqual([]);
});

test('submit stays disabled during module loading, then calculation works with the entered values', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => release = resolve);
  await page.route('**/*', async route => { if (route.request().resourceType() === 'script') await gate; await route.continue(); });
  try {
    await page.goto('/calculator', { waitUntil: 'commit' });
    await page.locator('#concentration').fill('2'); await page.locator('#dose').fill('250');
    await expect(page.getByRole('button', { name: 'Calculate volume', exact: true })).toBeDisabled();
    await page.locator('#dose').press('Enter'); await expect(page).toHaveURL(/\/calculator$/);
    release(); await expect(page.locator('#calculator-form')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'Calculate volume', exact: true }).click();
    await expect(page.locator('#result-volume')).toHaveText('0.125');
  } finally { release(); }
});
