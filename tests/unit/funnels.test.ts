import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { EVENT_NAMES, eventParams, type AnalyticsEvent } from '../../src/lib/analytics-policy';
import { ROOT, SOURCE, PUBLISHED, BUILT, CONTRACTS, CONTRACT_ORIGIN, validateManifest, generateManifest, checkManifest, verifyRemoteContracts } from '../../scripts/funnels';
const source = async () => JSON.parse(await readFile(resolve(ROOT, SOURCE), 'utf8'));

test('published funnels preserve the five stable flows and refer to real tracking constants/parameters', async () => {
  const data = await validateManifest(await source());
  assert.deepEqual(data.events, [...EVENT_NAMES]);
  assert.deepEqual(data.funnels.map(f => f.id), ['peptides-first-product','peptides-calculator','peptides-generation','peptides-saving','peptides-entry']);
  assert.deepEqual(data.funnels.map(f => f.definition.steps.length), [4,3,3,3,3]);
  for (const funnel of data.funnels) for (const step of funnel.definition.steps) for (const filter of step.filters ?? []) {
    if (filter.field.startsWith('customEvent:')) {
      const key = filter.field.slice('customEvent:'.length);
      assert.equal(eventParams(step.event as AnalyticsEvent, { [key]: filter.value })[key], filter.value);
    }
  }
  assert.ok(data.funnels[0]!.definition.steps.slice(1).every(s => s.filters?.some(f => f.field === 'customEvent:operation' && f.value === 'create')));
  assert.ok(data.funnels.every(f => f.definition.filters?.some(v => v.field === 'date' && v.value === '20261112' && v.not)));
});
test('schema, exact hostname, QA policy, unique IDs/events and actual event membership fail closed', async () => {
  for (const mutate of [
    (d: any) => { d.hostname = 'ybwdaisy.com'; },
    (d: any) => { delete d.qaPolicy; },
    (d: any) => { d.schemaVersion = 2; },
    (d: any) => { d.extra = 'not allowed'; },
    (d: any) => { d.events.push(d.events[0]); },
    (d: any) => { d.events.push('invented_event'); },
    (d: any) => { d.events.pop(); },
    (d: any) => { d.funnels.push(d.funnels[0]); },
    (d: any) => { d.funnels[0].definition.steps[0].event = 'invented_event'; },
    (d: any) => { d.funnels[0].definition.steps[0].withinSeconds = 604801; },
    (d: any) => { d.funnels[0].definition.steps[0].event = 'page_view|page_view'; },
    (d: any) => { d.funnels[0].definition.steps[0].event = '.*'; },
  ]) { const d = await source(); mutate(d); await assert.rejects(validateManifest(d)); }
});
test('finite OR lists support existing candidates but reject empty/unknown/excessive candidates', async () => {
  const d = await source(); d.funnels[0].definition.steps[0].event = 'page_view|calculator_start'; await validateManifest(d);
  for (const event of ['page_view|', 'page_view|invented_event', d.events.slice(0,11).join('|')]) { d.funnels[0].definition.steps[0].event = event; await assert.rejects(validateManifest(d)); }
});
test('one source generates byte-identical files; missing, stale, invalid and tampered build output fail', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'peptide-funnels-'));
  try {
    await mkdir(resolve(root, 'analytics/contracts'), { recursive: true });
    for (const file of CONTRACTS) await copyFile(resolve(ROOT, 'analytics/contracts', file), resolve(root, 'analytics/contracts', file));
    await assert.rejects(generateManifest(root));
    const raw = await readFile(resolve(ROOT, SOURCE)); await writeFile(resolve(root, SOURCE), raw);
    await assert.rejects(checkManifest(root)); await generateManifest(root); await checkManifest(root);
    assert.deepEqual(await readFile(resolve(root,PUBLISHED)),raw);
    await writeFile(resolve(root,PUBLISHED), '{}'); await assert.rejects(checkManifest(root));
    await generateManifest(root); await assert.rejects(checkManifest(root,true));
    await mkdir(resolve(root, 'dist/.well-known'), { recursive:true }); await writeFile(resolve(root,BUILT),raw); await checkManifest(root,true);
    await writeFile(resolve(root,BUILT),'{}'); await assert.rejects(checkManifest(root,true));
    await writeFile(resolve(root,SOURCE),'{'); await assert.rejects(generateManifest(root));
    assert.deepEqual(await readFile(resolve(root,PUBLISHED)),raw);
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('remote authority must match both verified JSON and Markdown; unavailable or changed content fails', async () => {
  const seen: string[] = [];
  await verifyRemoteContracts(ROOT, async (input, options) => {
    const url = String(input);seen.push(url);assert.equal(options?.redirect,'error');
    return new Response(await readFile(resolve(ROOT,'analytics/contracts',url.split('/').pop()!)));
  });
  assert.deepEqual(seen, CONTRACTS.map(file => CONTRACT_ORIGIN + file));
  await assert.rejects(verifyRemoteContracts(ROOT, async () => new Response('missing',{status:404})),/unavailable/);
  await assert.rejects(verifyRemoteContracts(ROOT, async () => new Response('{}')),/changed/);
  await assert.rejects(verifyRemoteContracts(ROOT, async () => { throw Error('offline'); }),/offline/);
});
