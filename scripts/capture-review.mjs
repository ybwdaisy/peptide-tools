import puppeteer from 'puppeteer-core';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
const run = promisify(execFile);
const helper = path.join(process.env.HALLMARK_DIR || path.join(homedir(), '.agents/skills/hallmark'), 'scripts/capture.mjs');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--remote-debugging-port=0'] });
const port = new URL(browser.wsEndpoint()).port;
try {
  for (const [size, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: size === 'phone', hasTouch: size === 'phone' });
    await page.evaluateOnNewDocument(() => localStorage.setItem('peptide-tools.analytics-consent.v1', 'denied'));
    async function capture(name, selector) {
      const args = [helper, '--cdp', port, '--target', await page.title(), '--out', '.hallmark/screens', '--name', name];
      if (selector) args.push('--selector', selector);
      const { stdout } = await run(process.execPath, args, { cwd: process.cwd() }); process.stdout.write(stdout);
    }
    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle0' });
    await page.type('#concentration', '5'); await page.type('#dose', '250'); await page.click('#calculator-form button[type="submit"]');
    await capture(`reviewed-home-${size}`);
    for (const route of ['/planner', '/library', '/library/cjc-1295']) {
      await page.goto(`http://127.0.0.1:4321${route}`, { waitUntil: 'networkidle0' });
      await capture(`reviewed-${route.slice(1).replaceAll('/', '-')}-${size}`);
    }
    await page.goto('http://127.0.0.1:4321/planner', { waitUntil: 'networkidle0' });
    await page.type('#protocol-name', 'Example protocol'); await page.select('#time-zone', 'UTC');
    await page.evaluate(() => {
      for (const [selector, value] of [['#start-date','2026-11-16'],['#end-date','2026-11-22'],['[data-field="time"]','08:00']]) {
        const input = document.querySelector(selector); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.type('[data-field="label"]', 'Example entry'); await page.type('[data-field="dose"]', '250');
    await page.click('#planner-form button[type="submit"]');
    await page.waitForSelector('#generated-calendar:not([hidden])');
    await capture(`reviewed-generated-calendar-${size}`, '#calendar-section');
    await page.close();
  }
} finally { await browser.close(); }
