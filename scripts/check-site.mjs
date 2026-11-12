import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const pages = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await walk(file); else if (file.endsWith('.html')) pages.push(file); } }
async function exists(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
await walk(root);
const errors = [];
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  for (const [label, regex] of [['language', file.includes(`${path.sep}zh${path.sep}`) ? /<html[^>]+lang="zh-CN"/ : /<html[^>]+lang="en"/], ['title', /<title>[^<]+<\/title>/], ['description', /name="description"/], ['viewport', /name="viewport"/], ['canonical', /rel="canonical"/]]) if (!regex.test(html)) errors.push(`${file}: missing ${label}`);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|data:|mailto:|#)/.test(raw)) continue;
    const pathname = raw.split(/[?#]/)[0];
    if (!pathname) continue;
    const target = pathname.startsWith('/') ? path.join(root, pathname) : path.resolve(path.dirname(file), pathname);
    if (!(await exists(target)) && !(await exists(`${target}.html`)) && !(await exists(path.join(target, 'index.html')))) errors.push(`${file}: missing ${raw}`);
  }
  if (process.env.VERCEL_ENV === 'production' && !/(?:^|\/)404(?:\/index)?\.html$/.test(file) && html.includes('noindex')) errors.push(`${file}: production page is noindex`);
}
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, 44);
assert.equal(pages.length, 46);
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified ${pages.length} pages, local assets/links, metadata and 44 sitemap URLs.`);
