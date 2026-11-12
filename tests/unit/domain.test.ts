import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, InputError } from '../../src/lib/calculator';
import { generateSchedule, validateProtocol, calendarMonth, type Protocol } from '../../src/lib/planner';
import { parseBackup, serializeBackup } from '../../src/lib/backup';
import { exportCalendar, foldLine } from '../../src/lib/ical';
import { eventParams, safePage, safeReferrer, safeCampaign } from '../../src/lib/analytics-policy';
import { peptides } from '../../src/data/peptides';

const protocol = (overrides: Partial<Protocol> = {}): Protocol => ({ id: 'protocol-1', name: 'Test schedule', timeZone: 'UTC', startDate: '2028-02-28', endDate: '2028-03-01', items: [{ id: 'item-1', label: 'User entry', dose: '250', unit: 'mcg', time: '08:00', frequency: { kind: 'daily' } }], ...overrides });

test('mg and mcg produce the same exact volume without binary drift', () => {
  assert.equal(calculate({ concentration: '5', dose: '250', unit: 'mcg' }).volume, '0.05');
  assert.equal(calculate({ concentration: '5', dose: '0.25', unit: 'mg' }).volume, '0.05');
  assert.equal(calculate({ concentration: '0.1', dose: '0.3', unit: 'mg' }).volume, '3');
});
test('very small valid results are not displayed as zero', () => {
  assert.equal(calculate({ concentration: '999999999', dose: '0.00000001', unit: 'mcg' }).volume, '0.00000000000000000001000000001');
});
test('U-100 markings remain distinct and never auto-round to a graduation', () => {
  const r = calculate({ concentration: '2', dose: '25', unit: 'mcg', syringe: { capacity: '0.3', increment: '1' } });
  assert.equal(r.markings, '1.25'); assert.equal(r.aligned, false);
  assert.equal(calculate({ concentration: '2', dose: '20', unit: 'mcg', syringe: { capacity: '0.3', increment: '1' } }).aligned, true);
});
test('invalid numbers and capacity overflow are rejected', () => {
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1e3', '1,000', '0.000000001']) assert.throws(() => calculate({ concentration: value, dose: '1', unit: 'mg' }), InputError);
  assert.throws(() => calculate({ concentration: '1', dose: '1', unit: 'mg', syringe: { capacity: '0.3', increment: '1' } }), /exceeds/);
});
test('daily recurrence includes both endpoints and leap day', () => {
  assert.deepEqual(generateSchedule(protocol()).map(e => e.date), ['2028-02-28', '2028-02-29', '2028-03-01']);
});
test('alternate and N-day rules are anchored to the cycle start', () => {
  const p = protocol(); p.items[0]!.frequency = { kind: 'alternate' };
  assert.deepEqual(generateSchedule(p).map(e => e.date), ['2028-02-28', '2028-03-01']);
  p.endDate = '2028-03-05'; p.items[0]!.frequency = { kind: 'interval', interval: 3 };
  assert.deepEqual(generateSchedule(p).map(e => e.date), ['2028-02-28', '2028-03-02', '2028-03-05']);
});
test('weekday schedules use ISO weekdays and reject empty selections', () => {
  const p = protocol(); p.items[0]!.frequency = { kind: 'weekdays', weekdays: [2, 3] };
  assert.deepEqual(generateSchedule(p).map(e => e.date), ['2028-02-29', '2028-03-01']);
  p.items[0]!.frequency.weekdays = []; assert.throws(() => validateProtocol(p), /weekday/);
});
test('local clock times stay fixed as UTC offset changes', () => {
  const p = protocol({ timeZone: 'America/New_York', startDate: '2026-03-07', endDate: '2026-03-09' });
  assert.deepEqual(generateSchedule(p).map(e => e.instant), ['2026-03-07T13:00:00Z', '2026-03-08T12:00:00Z', '2026-03-09T12:00:00Z']);
});
test('nonexistent DST time errors and repeated time picks the first occurrence', () => {
  const p = protocol({ timeZone: 'America/New_York', startDate: '2026-03-08', endDate: '2026-03-08' });
  p.items[0]!.time = '02:30'; assert.throws(() => generateSchedule(p), /does not exist/);
  p.startDate = p.endDate = '2026-11-01'; p.items[0]!.time = '01:30';
  assert.equal(generateSchedule(p)[0]!.instant, '2026-11-01T05:30:00Z');
});
test('invalid dates, long cycles, duplicate item IDs and invalid zones are rejected', () => {
  assert.throws(() => validateProtocol(protocol({ endDate: '2028-02-30' })));
  assert.throws(() => validateProtocol(protocol({ endDate: '2029-03-01' })), /366/);
  assert.throws(() => validateProtocol(protocol({ timeZone: 'Moon/Base' })), /zone/);
  const p = protocol(); p.items.push({ ...p.items[0]! }); assert.throws(() => validateProtocol(p), /unique/);
});
test('backup roundtrip is complete and unknown properties are stripped', () => {
  const p = protocol(); assert.deepEqual(parseBackup(serializeBackup([p])).protocols, [p]);
  const extra = { ...p, unexpected: 'not retained' }; assert.equal('unexpected' in parseBackup(JSON.stringify({ version: 1, protocols: [extra] })).protocols[0]!, false);
});
test('malformed, future-version, oversized and duplicate backups fail before restoration', () => {
  for (const raw of ['{', '{"version":2,"protocols":[]}', 'x'.repeat(1024 * 1024 + 1)]) assert.throws(() => parseBackup(raw));
  assert.throws(() => parseBackup(JSON.stringify({ version: 1, protocols: [protocol(), protocol()] })), /duplicate/);
});
test('calendar export uses UTC, stable UIDs, CRLF and no reminder', () => {
  const p = protocol(), list = generateSchedule(p), first = exportCalendar(p, list, new Date('2026-11-12T10:00:00Z'));
  assert.match(first, /DTSTART:20280228T080000Z\r\n/);
  assert.equal((first.match(/BEGIN:VEVENT/g) ?? []).length, 3);
  assert.doesNotMatch(first, /VALARM|TZID=/);
  assert.equal(first, exportCalendar(p, list, new Date('2026-11-12T10:00:00Z')));
});
test('calendar escapes content and folds by UTF-8 octets without splitting characters', () => {
  const p = protocol(); p.items[0]!.label = 'User entry; one, two\\three';
  const result = exportCalendar(p, generateSchedule(p)); assert.match(result, /User entry\\; one\\, two\\\\three/);
  const text = 'SUMMARY:' + '肽'.repeat(80), folded = foldLine(text);
  assert.equal(folded.replace(/\r\n /g, ''), text);
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
test('month calendar starts Monday and covers six weeks', () => {
  const days = calendarMonth('2026-11'); assert.equal(days.length, 42); assert.equal(days[0], '2026-10-26');
});
test('analytics removes reference identity, free text and unknown fields', () => {
  const page = safePage('/library/bpc-157'); assert.equal(page.page_location, 'https://peptides.ybwdaisy.com/library/detail');
  assert.doesNotMatch(JSON.stringify(page), /bpc/i);
  assert.deepEqual(eventParams('calculation_error', { error_code: 'required', dose: 'secret', item: 'BPC-157' }), { error_code: 'required' });
  assert.deepEqual(eventParams('calculation_error', { error_code: 'private entered text' }), {});
  assert.deepEqual(eventParams('export_completed', { export_type: 'json', filename: 'secret.json' }), { export_type: 'json' });
});
test('analytics filters campaigns and strips referrer path and query', () => {
  assert.deepEqual(safeCampaign('?utm_source=reddit&utm_medium=social&utm_campaign=launch&dose=secret'), { campaign_source: 'reddit', campaign_medium: 'social', campaign_name: 'launch' });
  assert.deepEqual(safeCampaign('?utm_source=bpc-157&utm_campaign=personal'), {});
  assert.equal(safeReferrer('https://example.com/private?dose=secret#name'), 'https://example.com');
  assert.equal(safeReferrer('https://peptides.ybwdaisy.com/library/bpc-157'), '');
});
test('all reference entries have unique slugs, evidence, source links and explicit half-life context', () => {
  assert.equal(peptides.length, 16); assert.equal(new Set(peptides.map(p => p.slug)).size, 16);
  for (const p of peptides) { assert.ok(p.sources.length); assert.equal(p.checked, '2026-11-12'); if (p.halfLife) assert.ok(p.halfLifeContext); }
});
