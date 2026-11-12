// Rasterize the existing vector mark with installed Chrome; no production dependency.
// Run: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const background = svg.match(/<rect\b[^>]*fill="([^"]+)"/)?.[1];
if (!background) throw new Error('The source icon must declare its background.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const faviconImages = [];
  for (const size of [16, 32, 48, 180]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    // iOS applies its own mask: supply an opaque, full-bleed square.
    const mark = size === 180 ? svg.replace(/\brx="[^"]*"/, 'rx="0"') : svg;
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:${size === 180 ? background : 'transparent'}}svg{display:block;width:100%;height:100%}</style>${mark}`);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const png = await page.screenshot({ omitBackground: size !== 180 });
    await page.close();
    if (size === 180) await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), png);
    else {
      faviconImages.push({ size, png });
      if (size === 32) await writeFile(new URL('../public/favicon-32x32.png', import.meta.url), png);
    }
  }
  // ICO directory containing PNG-encoded images at each native favicon size.
  const directory = Buffer.alloc(6 + faviconImages.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(faviconImages.length, 4);
  let offset = directory.length;
  for (const [index, { size, png }] of faviconImages.entries()) {
    const entry = 6 + index * 16;
    directory[entry] = directory[entry + 1] = size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  }
  await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([directory, ...faviconImages.map(({ png }) => png)]));
} finally {
  await browser.close();
}
