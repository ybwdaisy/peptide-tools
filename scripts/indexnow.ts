import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://peptides.ybwdaisy.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
type Change = { path: string; updated: string; reason: string };
type Config = { revision: string; hostname: string; key: string; changes: Change[] };
type Proof = { url: string; mainHash: string; html: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function mainHash(html: string) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  assert(main, 'Missing public main content');
  return hash(main);
}
export function validateConfig(value: unknown, sitemap: string): Config {
  const c = value as Config;
  assert(c && typeof c === 'object' && !Array.isArray(c), 'Invalid IndexNow configuration');
  assert.deepEqual(Object.keys(c).sort(), ['changes', 'hostname', 'key', 'revision']);
  assert.equal(c.hostname, new URL(ORIGIN).hostname, 'Unexpected hostname');
  assert(typeof c.revision === 'string' && /^\d{4}-\d{2}-\d{2}\.\d+$/.test(c.revision), 'Invalid revision');
  assert(typeof c.key === 'string' && /^[a-f0-9]{32}$/.test(c.key), 'Invalid public key');
  assert(Array.isArray(c.changes) && c.changes.length > 0 && c.changes.length <= 20, 'Select 1–20 changed pages');
  const canonicalURLs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  const seen = new Set<string>();
  for (const change of c.changes) {
    assert.deepEqual(Object.keys(change).sort(), ['path', 'reason', 'updated']);
    assert(typeof change.path === 'string' && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(change.path), 'Use a canonical path without query, fragment or trailing slash');
    assert(canonicalURLs.has(`${ORIGIN}${change.path}`), 'URL must be in the canonical public sitemap');
    assert(!seen.has(change.path), 'Duplicate URL'); seen.add(change.path);
    assert(typeof change.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(change.updated) && new Date(`${change.updated}T00:00:00Z`).toISOString().slice(0, 10) === change.updated, 'Invalid update date');
    assert(typeof change.reason === 'string' && change.reason.trim().length >= 20, 'Explain the substantive change');
  }
  return c;
}
export function validatePage(html: string, url: string, requireIndexable = false) {
  assert(html.includes(`<link rel="canonical" href="${url}">`), `Canonical mismatch: ${url}`);
  if (requireIndexable) assert(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html), `Page is noindex: ${url}`);
  return mainHash(html);
}
export function validateRecent(config: Config, now = Date.now()) {
  for (const { updated } of config.changes) {
    const age = now - Date.parse(`${updated}T00:00:00Z`);
    assert(age >= 0 && age < 31 * 86400000, 'Only recent changes (last 30 days) may be submitted. Update the release list, not its dates.');
  }
}
export async function verifyProduction(config: Config, proofs: Proof[], request = fetch) {
  const get = async (url: string) => {
    const r = await request(url, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30000) });
    assert.equal(r.status, 200, `Production HTTP status: ${url}`);
    assert(!/noindex/i.test(r.headers.get('x-robots-tag') ?? ''), `Production X-Robots-Tag: ${url}`);
    return r.text();
  };
  assert.equal(await get(`${ORIGIN}/${config.key}.txt`), config.key, 'Production key file does not match');
  for (const proof of proofs) {
    const html = await get(proof.url);
    assert.equal(validatePage(html, proof.url, true), proof.mainHash, `Deployed content differs from this build: ${proof.url}`);
  }
}
async function run() {
  const mode = process.argv[2];
  assert(['--check', '--submit'].includes(mode ?? '') && process.argv.length === 3, 'Use --check (offline) or --submit (explicit production notification)');
  const config = validateConfig(JSON.parse(await readFile('seo/indexnow.json', 'utf8')), await readFile('dist/sitemap.xml', 'utf8'));
  assert.equal(await readFile(`public/${config.key}.txt`, 'utf8'), config.key, 'Public key content mismatch');
  assert.equal(await readFile(`dist/${config.key}.txt`, 'utf8'), config.key, 'Built key content mismatch');
  const proofs: Proof[] = [];
  for (const change of config.changes) {
    const html = await readFile(path.join('dist', change.path, 'index.html'), 'utf8');
    const url = `${ORIGIN}${change.path}`;
    proofs.push({ url, html, mainHash: validatePage(html, url) });
  }
  if (mode === '--check') { console.log(`IndexNow offline validation: ${proofs.length} canonical changed pages; no requests sent.`); return; }
  validateRecent(config);
  const digest = hash(JSON.stringify(proofs.map(({ url, mainHash }) => ({ url, mainHash }))));
  const receiptPath = `qa/screenshots/indexnow/${config.revision}.json`;
  let previous;
  try { previous = JSON.parse(await readFile(receiptPath, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (previous?.digest === digest && [200, 202].includes(previous.status)) {
    console.log(`Already notified this content (${previous.status}, ${previous.submittedAt}); no repeat submission.`); return;
  }
  await verifyProduction(config, proofs);
  const response = await fetch(ENDPOINT, {
    method: 'POST', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: config.hostname, key: config.key, keyLocation: `${ORIGIN}/${config.key}.txt`, urlList: proofs.map(p => p.url) }),
  });
  const receipt = { revision: config.revision, digest, endpoint: ENDPOINT, submittedAt: new Date().toISOString(), status: response.status, urlList: proofs.map(p => p.url), result: response.status === 200 ? 'Notification received; indexing not guaranteed.' : response.status === 202 ? 'Notification received; key validation pending; indexing not guaranteed.' : 'Notification failed.' };
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  assert([200, 202].includes(response.status), `IndexNow HTTP ${response.status}; receipt: ${receiptPath}`);
  console.log(JSON.stringify(receipt, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await run();
