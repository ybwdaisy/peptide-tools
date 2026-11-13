import puppeteer from 'puppeteer-core';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
const run = promisify(execFile);
const helper = path.join(homedir(), '.agents/skills/hallmark/scripts/capture.mjs');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const port = new URL(browser.wsEndpoint()).port;
const base = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:4321';
try {
  for (const [size, width, height] of [['desktop', 1440, 900], ['phone', 390, 780]]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: size === 'phone', hasTouch: size === 'phone' });
    await page.evaluateOnNewDocument(() => localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied'));
    async function capture(name, selector) {
      await page.evaluate(() => document.fonts.ready);
      const args = [helper, '--cdp', port, '--target', await page.title(), '--out', 'qa/screenshots', '--name', `${name}-${size}`];
      if (selector) args.push('--selector', selector);
      process.stdout.write((await run(process.execPath, args)).stdout);
      await mkdir('qa/screenshots', { recursive: true });
      await page.screenshot({ path: `qa/screenshots/${name}-${size}-full.png`, fullPage: true });
    }
    for (const [route, name] of [['/', 'product-home'], ['/products/new', 'product-entry'], ['/calculator', 'quick-calculator'], ['/library', 'reference-index']]) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle0' }); await capture(name);
    }
    await page.goto(`${base}/products/new`, { waitUntil: 'networkidle0' });
    await page.type('#product-name', 'BPC-157'); await page.click('#product-continue');
    await page.select('#product-form-type', 'powder'); await page.type('#product-amount', '5'); await capture('label-entry');
    await page.click('#product-save'); await page.waitForSelector('#product-detail:not([hidden])'); await capture('product-detail');
    const productId = new URL(page.url()).hash.slice(1);
    await page.goto(`${base}/planner#${productId}`, { waitUntil: 'networkidle0' }); await capture('product-plan-empty');
    await page.type('#protocol-name', 'Personal plan'); await page.select('#time-zone', 'UTC');
    await page.evaluate(() => {
      for (const [selector, value] of [['#start-date','2028-02-28'],['#end-date','2028-03-01'],['[data-field="time"]','08:00']]) {
        const input = document.querySelector(selector); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.type('[data-field="dose"]', '250'); await page.select('[data-field="unit"]', 'mcg'); await page.select('[data-field="frequency"]', 'daily');
    await page.click('#planner-form button[type="submit"]'); await page.waitForSelector('#generated-calendar:not([hidden])');
    await page.click('#save-protocol'); await capture('product-cycle', '#calendar-section');
    await page.evaluate(() => {
      const key = 'peptide-tools.protocols.v1', data = JSON.parse(localStorage.getItem(key));
      data.products.push({ id: 'example-blend', revision: 'example-label', name: 'CJC-1295 NO DAC + Ipamorelin', brand: '', kind: 'blend', form: 'powder', amountMg: '10', components: [{ name: 'CJC-1295 NO DAC', amountMg: '5' }, { name: 'Ipamorelin', amountMg: '5' }], identityConfirmed: false, concentrationMgMl: '', concentrationVerified: false });
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.goto(`${base}/products`, { waitUntil: 'networkidle0' }); await capture('my-products');
    await page.goto(`${base}/zh/products`, { waitUntil: 'networkidle0' }); await capture('my-products-zh');
    await context.close();
  }
} finally { await browser.close(); }
