import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getLocale, localePath, translate, formatMessage, messages } from '../../src/lib/i18n';
import { peptides, FDA_RISK_SOURCE } from '../../src/data/peptides';
import { safePage } from '../../src/lib/analytics-policy';
import { exportCalendar } from '../../src/lib/ical';
import { generateSchedule, type Protocol } from '../../src/lib/planner';

test('English is the default and explicit Chinese paths preserve the current destination', () => {
  for (const path of ['/', '/calculator', '/zh-other', '/ZH']) assert.equal(getLocale(path), 'en');
  for (const path of ['/zh', '/zh/', '/zh/library/bpc-157']) assert.equal(getLocale(path), 'zh');
  assert.equal(localePath('/planner/', 'zh'), '/zh/planner');
  assert.equal(localePath('/zh/library/bpc-157', 'en'), '/library/bpc-157');
  assert.equal(localePath('/zh', 'en'), '/');
  assert.equal(translate('Calculate volume', 'en'), 'Calculate volume');
  assert.equal(translate('Calculate volume', 'zh'), '计算体积');
  assert.equal(translate('constructor', 'zh'), 'constructor');
  assert.equal(translate('__proto__', 'zh'), '__proto__');
  assert.equal(formatMessage('Delete saved protocol {name}', 'zh', { name: '<Delete> {zone}' }), '删除已保存协议 <Delete> {zone}');
});

test('Chinese translations cover page copy, validation messages and every sourced reference fact', async () => {
  for (const [english, chinese] of Object.entries(messages)) {
    assert.ok(chinese.trim(), english);
    assert.deepEqual([...english.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...chinese.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), english);
  }
  for (const peptide of peptides) {
    for (const value of [peptide.summary, peptide.limitation, peptide.risk, peptide.evidence, peptide.halfLife, peptide.halfLifeContext, ...peptide.sources.map(s => s.title)]) if (value) assert.ok(messages[value], `${peptide.slug}: ${value}`);
  }
  assert.ok(messages[FDA_RISK_SOURCE.title]);
  const files = ['pages/index.astro','pages/calculator.astro','pages/planner.astro','pages/library/index.astro','pages/library/[slug].astro','pages/privacy.astro','pages/disclaimer.astro','pages/404.astro','layouts/Shell.astro','components/Calculator.astro','scripts/planner.ts','scripts/calculator.ts','scripts/analytics.ts','lib/planner.ts','lib/calculator.ts','lib/backup.ts'];
  for (const file of files) {
    const source = await readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8');
    const copy = [ ...source.matchAll(/\b(?:t|ui)\(["']([^"'\n]+)["']/g), ...source.matchAll(/(?:PlannerError|Error)\('([^']+)'\)/g), ...source.matchAll(/InputError\('[^']+', '([^']+)'/g) ];
    for (const [, value] of copy) assert.ok(messages[value!], `${file}: ${value}`);
  }
});

test('localized routes share the original anonymous analytics page groups', () => {
  for (const path of ['/', '/calculator', '/planner', '/library', '/library/secret-user-identity', '/privacy', '/disclaimer']) assert.deepEqual(safePage(localePath(path, 'zh')), safePage(path));
  const serialized = JSON.stringify(safePage('/zh/library/secret-user-identity'));
  assert.match(serialized, /\/library\/detail/);
  assert.doesNotMatch(serialized, /secret-user-identity|\/zh/);
});

test('Chinese ICS descriptions preserve user text, identifiers, instants and UTF-8 folding', () => {
  const protocol: Protocol = { id: 'protocol', name: 'Delete 自填计划', timeZone: 'UTC', startDate: '2028-02-29', endDate: '2028-02-29', items: [{ id: 'item', label: 'Calculator 自填项目', dose: '250', unit: 'mcg', time: '08:00', frequency: { kind: 'daily' } }] };
  const events = generateSchedule(protocol), now = new Date('2028-01-01T00:00:00Z');
  const en = exportCalendar(protocol, events, now), zh = exportCalendar(protocol, events, now, 'zh');
  assert.equal(en.match(/UID:[^\r]+/)?.[0], zh.match(/UID:[^\r]+/)?.[0]);
  assert.equal(en.match(/DTSTART:[^\r]+/)?.[0], zh.match(/DTSTART:[^\r]+/)?.[0]);
  assert.match(zh.replace(/\r\n /g, ''), /SUMMARY:Calculator 自填项目: 250 mcg/);
  assert.match(zh.replace(/\r\n /g, ''), /Delete 自填计划\. 用户自行填写的排程/);
  for (const line of zh.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.doesNotMatch(zh, /VALARM/);
});
