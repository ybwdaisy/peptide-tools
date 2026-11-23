import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const origin = 'https://peptides.ybwdaisy.com';
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(urls).size, urls.length, 'Duplicate canonical sitemap URLs');
assert(!sitemap.includes('<lastmod>'), 'Do not invent update timestamps for unchanged pages');
const titles = new Set();
for (const url of urls) {
  const u = new URL(url);
  assert.equal(u.origin, origin);
  assert(!u.search && !u.hash && !/\/(products|today)(\/|$)/.test(u.pathname), 'Sitemap contains a nonpublic URL');
  const html = await readFile(path.join('dist', u.pathname, 'index.html'), 'utf8');
  assert(html.includes(`<link rel="canonical" href="${url}">`), `Canonical mismatch: ${url}`);
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].filter(m => m[1].replace(/<[^>]*>/g, '').trim());
  // The planner also has an empty print-only H1 populated from local user data.
  assert.equal(headings.length, 1, `Expected one nonempty public H1: ${url}`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(title && !titles.has(title), `Missing/duplicate title: ${url}`); titles.add(title);
  assert(/<meta name="description" content="[^"]+"/.test(html), `Missing description: ${url}`);
  const zh = /^\/zh(?:\/|$)/.test(u.pathname);
  assert(html.includes(`lang="${zh ? 'zh-CN' : 'en'}"`));
  const enPath = u.pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
  const zhPath = `/zh${enPath === '/' ? '' : enPath}`;
  for (const [lang, route] of [['en', enPath], ['zh-CN', zhPath], ['x-default', enPath]]) {
    assert(urls.includes(origin + route), `Alternate is not indexable: ${route}`);
    assert(html.includes(`hreflang="${lang}" href="${origin}${route}"`), `Incorrect alternate: ${url}`);
  }
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
  assert.equal(data?.url, url); assert.equal(data?.inLanguage, zh ? 'zh-CN' : 'en');
  assert.equal(data?.description, html.match(/<meta name="description" content="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&'));
  if (process.env.VERCEL_ENV === 'production') assert(!html.includes('content="noindex'), `Unexpected noindex: ${url}`);
}
for (const prefix of ['', '/zh']) {
  const calculator = await readFile(`dist${prefix}/calculator/index.html`, 'utf8');
  for (const anchor of ['mg-mcg', 'mg-per-ml', 'u100-volume']) {
    assert(calculator.includes(`<section id="${anchor}"`), `Missing visible unit explanation: ${anchor}`);
    for (const route of ['/', '/calculator', '/library']) {
      const html = await readFile(path.join('dist', `${prefix}${route}`, 'index.html'), 'utf8');
      assert(html.includes(`href="${prefix}/calculator#${anchor}"`), `Missing localized reference link: ${prefix}${route}`);
    }
  }
  assert(calculator.includes('0.25 mg ÷ 2 mg/mL = 0.125 mL'));
  assert(calculator.includes('nist.gov/pml/owm/metric-si-prefixes'));
  assert(calculator.includes('goldbook.iupac.org/terms/view/M03713'));
  assert(calculator.includes('dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid='));
}
const robots = await readFile('dist/robots.txt', 'utf8');
assert.equal(robots, process.env.VERCEL_ENV === 'production' ? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
console.log(`SEO verified: ${urls.length} canonical URLs, unique titles, reciprocal language alternates, matching structured data and bilingual visible unit guides.`);
