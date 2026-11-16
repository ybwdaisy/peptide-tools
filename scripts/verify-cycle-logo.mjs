// Capture the real header and deliverable logo assets in an isolated local Chrome context.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const output = new URL('../qa/evidence/logo-cycle/', import.meta.url);
await mkdir(output, { recursive: true });
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4333';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const uri = async (path, type = 'image/svg+xml') => `data:${type};base64,${(await readFile(new URL(path, root))).toString('base64')}`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const issues = [], cases = [];
try {
  const page = await browser.newPage();
  for (const [file, width, height] of [['mark',1024,1024], ['mark-inverse',1024,1024], ['logo',880,160], ['logo-inverse',880,160]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${await readFile(new URL(`public/brand/${file}.svg`, root), 'utf8')}`);
    await page.evaluate(() => document.fonts.ready);
    if (file.startsWith('logo')) {
      const bounds = await page.$eval('text', element => { const b = element.getBBox(); return { right: b.x + b.width, bottom: b.y + b.height }; });
      assert.ok(bounds.right <= 440 && bounds.bottom <= 80, `${file}: wordmark clipped`);
    }
    await page.screenshot({ path: new URL(`public/brand/${file}.png`, root).pathname, omitBackground: true });
  }
  const [mark, logo, logoReverse, icon, tiny, tiny16] = await Promise.all([
    uri('public/brand/mark.svg'), uri('public/brand/logo.svg'), uri('public/brand/logo-inverse.svg'), uri('public/apple-touch-icon.png','image/png'), uri('public/favicon-32x32.png','image/png'), uri('public/favicon-16x16.png','image/png'),
  ]);
  await page.setViewport({ width: 1200, height: 760, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#10283d;font:16px sans-serif}.lockup{height:220px;display:flex;align-items:center;padding:32px 48px}.lockup img{width:660px;height:120px}.dark{background:#10283d;color:white}.samples{display:flex;align-items:center;gap:48px;padding:32px 48px;height:300px}.sample{display:grid;gap:12px;justify-items:center}.mark{width:180px;height:180px}.icon{width:180px;height:180px}.native{display:flex;gap:24px;align-items:center}.pixel{width:128px;height:128px;image-rendering:pixelated}</style><div class="lockup"><img src="${logo}" alt="PeptideTools"/></div><div class="lockup dark"><img src="${logoReverse}" alt="PeptideTools reversed"/></div><div class="samples"><div class="sample"><img class="mark" src="${mark}" alt="Standalone mark"/><span>Vector mark</span></div><div class="sample"><img class="icon" src="${icon}" alt="iOS icon"/><span>iOS180px</span></div><div class="sample"><div class="native"><img src="${tiny16}" width="16" height="16" alt="16px"/><img src="${tiny}" width="32" height="32" alt="32px"/></div><span>16px /32px</span></div><div class="sample"><img class="pixel" src="${tiny}" alt="Pixel inspection"/><span>32px enlarged</span></div></div>`);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  await page.screenshot({ path: new URL('brand-proof.png', output).pathname });
  await page.close();
  for (const [width,height] of [[1440,900],[768,900],[700,900],[641,900],[390,844],[320,844]]) for (const route of ['/products','/zh/products']) {
    const context = await browser.createBrowserContext();
    const p = await context.newPage();
    p.on('pageerror', error => issues.push(String(error)));
    p.on('request', request => { if (/google-analytics|googletagmanager/.test(request.url())) issues.push('Unexpected analytics request'); });
    await p.setViewport({ width,height,deviceScaleFactor: 1 });
    await p.evaluateOnNewDocument(() => localStorage.setItem('peptide-tools.analytics-consent.v1','denied'));
    const response = await p.goto(base + route, { waitUntil: 'networkidle0' });
    assert.equal(response.status(),200);
    await p.evaluate(() => document.fonts.ready);
    const status = await p.evaluate(() => {
      const brand = document.querySelector('.brand'), mark = document.querySelector('.brand-mark');
      const bounds = brand.getBoundingClientRect();
      const controls = [...document.querySelectorAll('.site-header a')].map(el => { const r = el.getBoundingClientRect(); return { label:el.textContent, left:r.left, right:r.right, top:r.top, bottom:r.bottom }; });
      const collisions = controls.flatMap((a,i) => controls.slice(i+1).filter(b => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1).map(b => [a.label,b.label]));
      return { scroll: document.documentElement.scrollWidth, loaded: mark.complete && mark.naturalWidth > 0, href: brand.getAttribute('href'), label: brand.getAttribute('aria-label'), brandWidth: bounds.width, markWidth: mark.getBoundingClientRect().width, collisions };
    });
    assert.ok(status.loaded); assert.equal(status.markWidth,32); assert.ok(status.scroll <= width);
    assert.deepEqual(status.collisions,[], `${width}${route}: header controls overlap`);
    assert.equal(status.href,route.startsWith('/zh')?'/zh':'/');
    await p.screenshot({ path:new URL(`${route.startsWith('/zh')?'zh':'en'}-${width}.png`,output).pathname });
    await p.focus('.brand');
    const focused = await p.$eval('.brand', el => ({ width:getComputedStyle(el).outlineWidth, style:getComputedStyle(el).outlineStyle }));
    assert.notEqual(focused.style,'none'); assert.notEqual(focused.width,'0px');
    if(width===390) await p.screenshot({path:new URL(`${route.startsWith('/zh')?'zh':'en'}-focus.png`,output).pathname});
    await p.click('.brand');
    await p.waitForFunction(() => !!document.getElementById('home-heading'));
    assert.ok(new URL(p.url()).pathname === (route.startsWith('/zh')?'/zh':'/'));
    cases.push({ width,height,route,...status,focus:focused });
    await context.close();
  }
  const ios = await sharp(await readFile(new URL('public/apple-touch-icon.png',root))).raw().toBuffer({ resolveWithObject:true });
  assert.equal(ios.info.width,180); assert.equal(ios.info.height,180);
  if(ios.info.channels===4) for(let i=3;i<ios.data.length;i+=4) assert.equal(ios.data[i],255,'iOS icon must be fully opaque');
  const ico = await readFile(new URL('public/favicon.ico',root));
  assert.equal(ico.readUInt16LE(2),1); assert.equal(ico.readUInt16LE(4),3);
  assert.deepEqual([0,1,2].map(i=>ico[6+i*16]),[16,32,48]);
  assert.deepEqual(issues,[]);
  await writeFile(new URL('verification.json',output),JSON.stringify({ cases, issues, ios:'180x180 fully opaque',ico:[16,32,48],note:'Isolated Chrome viewport evidence, not physical iOS home-screen installation.' },null,2));
  console.log('12 EN/ZH header, focus and navigation cases passed; SVG/PNG, ICO sizes and opaque iOS icon verified.');
} finally { await browser.close(); }
