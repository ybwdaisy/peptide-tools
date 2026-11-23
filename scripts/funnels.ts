import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { EVENT_NAMES } from '../src/lib/analytics-policy';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const HOSTNAME = 'peptides.ybwdaisy.com';
export const CONTRACT_ORIGIN = 'https://site-pulse-nine-tau.vercel.app/contracts/';
export const CONTRACTS = ['funnels-v1.schema.json', 'funnels-v1.md'] as const;
export const SOURCE = 'analytics/funnels.json';
export const PUBLISHED = 'public/.well-known/site-pulse.json';
export const BUILT = 'dist/.well-known/site-pulse.json';
export interface Manifest {
  schemaVersion: 1; hostname: string; revision: string; qaPolicy: string; events: string[];
  funnels: { id: string; definition: { name: string; filters?: Filter[]; steps: { label: string; event: string; pageContains?: string; filters?: Filter[]; withinSeconds?: number; directlyFollowed?: boolean }[] }; source?: { url: string; note: string } }[];
}
interface Filter { field: string; match: 'EXACT' | 'CONTAINS' | 'FULL_REGEXP'; value: string; not?: boolean }
const unique = (items: readonly string[], name: string) => assert.equal(new Set(items).size, items.length, `Duplicate ${name}`);

export async function validateManifest(value: unknown, root = ROOT): Promise<Manifest> {
  const schema = JSON.parse(await readFile(resolve(root, 'analytics/contracts/funnels-v1.schema.json'), 'utf8'));
  assert.equal(schema.$id, CONTRACT_ORIGIN + CONTRACTS[0], 'Unexpected schema authority');
  const validate = new Ajv({ allErrors: true, strict: true }).compile<Manifest>(schema);
  assert.ok(validate(value), `Invalid funnel manifest: ${JSON.stringify(validate.errors)}`);
  const manifest = value as Manifest;
  assert.equal(manifest.hostname, HOSTNAME, 'Unexpected product hostname');
  unique(manifest.events, 'events'); unique(manifest.funnels.map(f => f.id), 'funnel IDs');
  unique(EVENT_NAMES, 'runtime event constants');
  // The editable file must track the actual product contract, not validate itself.
  assert.deepEqual([...manifest.events].sort(), [...EVENT_NAMES].sort(), 'Manifest events must match actual EVENT_NAMES');
  for (const funnel of manifest.funnels) for (const step of funnel.definition.steps) {
    const candidates = step.event.split('|');
    assert.ok(candidates.length >= 1 && candidates.length <= 10 && candidates.every(event => /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(event)), 'Step event must be a finite event OR list');
    unique(candidates, 'step event candidates');
    for (const event of candidates) assert.ok(manifest.events.includes(event), `Unknown step event: ${event}`);
  }
  return manifest;
}

async function loadSource(root: string) {
  const raw = await readFile(resolve(root, SOURCE));
  const manifest = await validateManifest(JSON.parse(raw.toString('utf8')), root);
  assert.ok((await readFile(resolve(root, 'analytics/contracts/funnels-v1.md'))).length, 'Missing cached contract');
  return { raw, manifest };
}
export async function generateManifest(root = ROOT) {
  const { raw, manifest } = await loadSource(root);
  const target = resolve(root, PUBLISHED); await mkdir(dirname(target), { recursive: true });
  await writeFile(target, raw); return manifest;
}
export async function checkManifest(root = ROOT, built = false) {
  const { raw, manifest } = await loadSource(root);
  assert.ok(raw.equals(await readFile(resolve(root, PUBLISHED))), 'Published manifest differs from analytics/funnels.json; regenerate it');
  if (built) assert.ok(raw.equals(await readFile(resolve(root, BUILT))), 'Built manifest differs from analytics/funnels.json');
  return manifest;
}
export async function verifyRemoteContracts(root = ROOT, fetcher: typeof fetch = fetch) {
  await checkManifest(root);
  for (const file of CONTRACTS) {
    // Fixed HTTPS JSON/Markdown only. Never download or execute remote JavaScript.
    const response = await fetcher(CONTRACT_ORIGIN + file, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.ok(response.ok, `Public contract unavailable: ${file} HTTP ${response.status}`);
    const length = response.headers.get('content-length');
    assert.ok(!length || Number(length) <= 128 * 1024, 'Public contract exceeds size limit');
    const remote = Buffer.from(await response.arrayBuffer());
    assert.ok(remote.length <= 128 * 1024, 'Public contract exceeds size limit');
    const cached = await readFile(resolve(root, 'analytics/contracts', file));
    assert.ok(remote.equals(cached), `Public contract changed: ${file}; review and refresh the verified cache`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? '--check';
  assert.equal(process.argv.length <= 3, true, 'Unexpected arguments');
  if (mode === '--generate') await generateManifest();
  else if (mode === '--check') await checkManifest();
  else if (mode === '--dist') await checkManifest(ROOT, true);
  else if (mode === '--remote') await verifyRemoteContracts();
  else throw new Error(`Unknown mode ${mode}`);
  console.log(`Funnel manifest ${mode}: validated against real events and public v1 contract.`);
}
