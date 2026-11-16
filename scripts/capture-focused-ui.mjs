import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4333';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use an isolated local preview.');
const out = new URL('../qa/evidence/focused-label/', import.meta.url);
await mkdir(out, { recursive: true });
const products = ['BPC-157', 'Ipamorelin', 'GHK-Cu'].map((name, i) => ({
  id: `example-${i}`, revision: `r${i}`, name, brand: '', kind: 'single', form: 'powder',
  amountMg: i === 2 ? '50' : '5', components: [], identityConfirmed: true,
  concentrationMgMl: i === 0 ? '2' : '', concentrationVerified: i === 0,
}));
const raw = JSON.stringify({ version: 2, products, protocols: [] });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const issues = [], cases = [];
try {
  for (const [device, width, height] of [['desktop', 1440, 1024], ['phone', 390, 844], ['narrow', 320, 844]]) {
    for (const locale of ['', '/zh']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      page.on('pageerror', error => issues.push(String(error)));
      page.on('request', request => { if (/google-analytics|googletagmanager/.test(request.url())) issues.push(`Unexpected analytics: ${request.url()}`); });
      await page.evaluateOnNewDocument(value => {
        localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied');
        if (!localStorage.getItem('peptide-tools.protocols.v1')) localStorage.setItem('peptide-tools.protocols.v1', value);
      }, raw);
      for (const route of ['/products', '/calculator', '/products/new', '/planner', '/', '/library']) {
        const routePath = (locale + (route === '/' ? '' : route)) || '/';
        const response = await page.goto(base + routePath, { waitUntil: 'networkidle0' });
        assert.equal(response.status(), 200, routePath);
        await page.waitForSelector('#main');
        await page.evaluate(() => document.fonts.ready);
        if (route === '/calculator') {
          await page.select('#calculator-source-mode', 'label');
          await page.type('#calculator-source-vial-amount', '5');
          await page.type('#calculator-source-final-volume', '2.5');
          await page.type('#dose', '250');
          await page.click('#calculator-form button[type="submit"]');
          assert.equal(await page.$eval('#result-volume', el => el.textContent), '0.125');
        }
        if (route === '/products/new') {
          await page.type('#product-name', 'Example label');
          await page.click('#product-continue');
          await page.select('#product-form-type', 'powder');
          await page.type('#product-amount', '5');
        }
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, font: getComputedStyle(document.body).fontFamily, fontLoaded: document.fonts.check('16px "Schibsted Grotesk"') }));
        assert.ok(dimensions.scroll <= width, `${device} ${locale}${route} overflow: ${dimensions.scroll}`);
        assert.equal(dimensions.fontLoaded, true);
        assert.equal(await page.evaluate(() => localStorage.getItem('peptide-tools.protocols.v1')), raw);
        const name = `${locale ? 'zh' : 'en'}-${route.replaceAll('/', '-').replace(/^-/, '') || 'home'}-${device}`;
        if (device !== 'narrow') {
          await page.screenshot({ path: new URL(`${name}.png`, out).pathname, fullPage: false });
          await page.screenshot({ path: new URL(`${name}-full.png`, out).pathname, fullPage: true });
        }
        if (route === '/planner') {
          await page.type('#protocol-name', 'Example plan');
          await page.select('[data-field="productId"]', products[0].id);
          await page.select('[data-field="unit"]', 'mcg');
          await page.select('[data-field="frequency"]', 'daily');
          await page.evaluate(() => {
            for (const [selector, value] of [['#start-date', '2026-11-15'], ['#end-date', '2026-11-21'], ['[data-field="dose"]', '250'], ['[data-field="time"]', '09:00']]) {
              const field = document.querySelector(selector); field.value = value; field.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          await page.click('#planner-form button[type="submit"]');
          assert.equal(await page.$eval('#generated-calendar', element => element.hidden), false, `${name}: ${await page.$eval('#planner-error', element => element.textContent)}`);
          if (device !== 'narrow') {
            const agenda = await page.$('.day-agenda');
            await agenda.screenshot({ path: new URL(`${name}-agenda.png`, out).pathname });
          }
        }
        cases.push({ device, route: routePath, ...dimensions });
      }
      await context.close();
    }
  }
  assert.deepEqual(issues, []);
  await writeFile(new URL('verification.json', out), JSON.stringify({ cases, issues, note: 'Synthetic label records in isolated browser contexts. Local preview; analytics denied. Chrome viewport emulation is not physical iPhone evidence.' }, null, 2));
  console.log(`${cases.length} rendered EN/ZH route/viewport cases passed; no page errors or analytics requests.`);
} finally { await browser.close(); }
