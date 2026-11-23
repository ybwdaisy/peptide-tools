import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ORIGIN, mainHash, validateConfig, validatePage, validateRecent, verifyProduction } from '../../scripts/indexnow';
const config = JSON.parse(await readFile('seo/indexnow.json', 'utf8'));
const sitemap = `<urlset>${config.changes.map((c: { path: string }) => `<url><loc>${ORIGIN}${c.path}</loc></url>`).join('')}</urlset>`;
test('IndexNow rejects other hosts, private/ambiguous URLs, duplicates and stale submissions', () => {
  assert.equal(validateConfig(config, sitemap).changes.length, 6);
  for (const change of [
    { ...config, hostname: 'another.example' },
    ...['//another.example', '/today', '/calculator?qa=1', '/calculator#mg-mcg', '/calculator/'].map(path => ({ ...config, changes: [{ ...config.changes[0], path }] })),
    { ...config, changes: [config.changes[0], config.changes[0]] },
    { ...config, key: '../invalid' },
  ]) assert.throws(() => validateConfig(change, sitemap));
  assert.throws(() => validateRecent(config, Date.parse('2027-01-01')));
  assert.throws(() => validateRecent(config, Date.parse('2026-11-22')));
});
test('IndexNow will not verify/notify a redirected, noindex, stale or wrong-key production page', async () => {
  const url = `${ORIGIN}/calculator`;
  const html = `<link rel="canonical" href="${url}"><main><h1>Tool</h1>Current content</main>`;
  const proofs = [{ url, html, mainHash: mainHash(html) }];
  assert.throws(() => validatePage(html.replace(url, `${ORIGIN}/planner`), url));
  assert.throws(() => validatePage(`<meta name="robots" content="noindex">${html}`, url, true));
  const fixture = (page: string, key = config.key, status = 200, headers = {}) => (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
    assert(String(input).startsWith(ORIGIN));
    return new Response(String(input).endsWith('.txt') ? key : page, { status, headers });
  }) as typeof fetch;
  await verifyProduction(config, proofs, fixture(html));
  await assert.rejects(() => verifyProduction(config, proofs, fixture(html, 'wrong-key')));
  await assert.rejects(() => verifyProduction(config, proofs, fixture(html.replace('Current', 'Old'))));
  await assert.rejects(() => verifyProduction(config, proofs, fixture(html, config.key, 302)));
  await assert.rejects(() => verifyProduction(config, proofs, fixture(html, config.key, 200, { 'X-Robots-Tag': 'noindex' })));
});
