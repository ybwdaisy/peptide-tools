import { Temporal } from '@js-temporal/polyfill';
import { positiveDecimal, type DoseUnit } from './calculator';
import { validateProduct, type Product } from './products';
import { occurrencesOnDate, type Protocol, type ProtocolItem, type Occurrence } from './planner';

export interface ScheduledEntry {
  protocolId: string; protocolName: string; itemId: string;
  date: string; time: string; instant: string; timeZone: string;
  label: string; dose: string; unit: DoseUnit;
  product?: Product; doseBasis?: string;
}
export interface ActualRecord {
  id: string; status: 'taken' | 'skipped'; label: string; dose: string; unit: DoseUnit;
  occurredAt: string; timeZone: string; notes: string; createdAt: string; updatedAt: string;
  scheduled?: ScheduledEntry; product?: Product; doseBasis?: string;
}
export const MAX_RECORDS = 10000;
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,80}$/.test(v);
function text(v: unknown, max: number) { return typeof v === 'string' && !!v.trim() && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v); }
function zone(v: unknown): string {
  if (typeof v !== 'string' || v.length > 100) throw new Error('Choose a valid time zone.');
  try { Temporal.Now.zonedDateTimeISO(v); return v; } catch { throw new Error('Choose a valid time zone.'); }
}
function instant(v: unknown) {
  if (typeof v !== 'string' || v.length > 40) throw new Error('Choose a valid record time.');
  try { const t = Temporal.Instant.from(v); const year = t.toZonedDateTimeISO('UTC').year; if (year < 1999 || year > 2101) throw new Error(); return t.toString(); }
  catch { throw new Error('Choose a valid record time.'); }
}
function amount(dose: unknown, unit: unknown) {
  if (typeof dose !== 'string' || dose.length > 100 || !['mg', 'mcg'].includes(String(unit))) throw new Error('Enter a positive amount and select mg or mcg.');
  try { return positiveDecimal(dose).toFixed(); } catch { throw new Error('Enter a positive amount and select mg or mcg.'); }
}
function productFields(p: { product?: Product; doseBasis?: string }) {
  const product = p.product === undefined ? undefined : validateProduct(p.product);
  if (!product) { if (p.doseBasis !== undefined) throw new Error('The record product is invalid.'); return {}; }
  if (product.kind === 'blend' && p.doseBasis !== 'total' && (typeof p.doseBasis !== 'string' || !/^(0|[1-9]\d*)$/.test(p.doseBasis) || !product.components[Number(p.doseBasis)])) throw new Error('Choose which ingredient or total mixture the amount refers to.');
  return { product, ...(product.kind === 'blend' ? { doseBasis: p.doseBasis } : {}) };
}
export function validateScheduledEntry(value: unknown): ScheduledEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The scheduled record is invalid.');
  const p = value as ScheduledEntry;
  if (!identifier(p.protocolId) || !identifier(p.itemId) || !text(p.protocolName, 80) || !text(p.label, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.time)) throw new Error('The scheduled record is invalid.');
  const timeZone = zone(p.timeZone), at = instant(p.instant);
  const local = Temporal.Instant.from(at).toZonedDateTimeISO(timeZone);
  if (local.toPlainDate().toString() !== p.date || local.toPlainTime().toString({ smallestUnit: 'minute' }) !== p.time) throw new Error('The scheduled record is invalid.');
  return { protocolId: p.protocolId, protocolName: p.protocolName.trim(), itemId: p.itemId, date: p.date, time: p.time, instant: at, timeZone, label: p.label.trim(), dose: amount(p.dose, p.unit), unit: p.unit, ...productFields(p) };
}
export function validateRecord(value: unknown): ActualRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The actual record is invalid.');
  const p = value as ActualRecord;
  if (!identifier(p.id) || !['taken', 'skipped'].includes(p.status) || !text(p.label, 80) || typeof p.notes !== 'string' || p.notes.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(p.notes)) throw new Error('The actual record is invalid.');
  const createdAt = instant(p.createdAt), updatedAt = instant(p.updatedAt);
  if (Temporal.Instant.compare(createdAt, updatedAt) > 0) throw new Error('The actual record is invalid.');
  if (!['mg', 'mcg'].includes(p.unit)) throw new Error('Enter a positive amount and select mg or mcg.');
  return { id: p.id, status: p.status, label: p.label.trim(), dose: p.status === 'taken' ? amount(p.dose, p.unit) : '', unit: p.unit, occurredAt: instant(p.occurredAt), timeZone: zone(p.timeZone), notes: p.notes.trim(), createdAt, updatedAt, ...(p.scheduled === undefined ? {} : { scheduled: validateScheduledEntry(p.scheduled) }), ...productFields(p) };
}
// Identity is a tuple, not a hyphen-joined string: IDs themselves can contain hyphens.
export function scheduledKey(p: Pick<ScheduledEntry, 'protocolId' | 'itemId' | 'date'>) { return JSON.stringify([p.protocolId, p.itemId, p.date]); }
export function snapshot(p: Protocol, item: ProtocolItem, event: Occurrence): ScheduledEntry {
  return validateScheduledEntry({ protocolId: p.id, protocolName: p.name, itemId: item.id, date: event.date, time: event.time, instant: event.instant, timeZone: p.timeZone, label: item.label, dose: item.dose, unit: item.unit, ...(item.product ? { product: item.product, ...(item.doseBasis ? { doseBasis: item.doseBasis } : {}) } : {}) });
}
export function dailyEntries(protocols: Protocol[], date: string, timeZone: string): { entries: ScheduledEntry[]; unavailable: string[] } {
  const entries: ScheduledEntry[] = [], unavailable: string[] = [];
  for (const p of protocols) {
    try { for (const event of occurrencesOnDate(p, date, timeZone)) entries.push(snapshot(p, p.items.find(i => i.id === event.itemId)!, event)); }
    catch { unavailable.push(p.name); }
  }
  return { entries: entries.sort((a, b) => Temporal.Instant.compare(a.instant, b.instant) || scheduledKey(a).localeCompare(scheduledKey(b))), unavailable };
}
export function recordInstant(date: string, time: string, timeZone: string, disambiguation: 'reject' | 'earlier' | 'later' = 'reject') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid record time.');
  try {
    const plain = Temporal.PlainDateTime.from(`${date}T${time}`);
    if (plain.year < 2000 || plain.year > 2100) throw new Error();
    const zoned = plain.toZonedDateTime(zone(timeZone), { disambiguation });
    if (!zoned.toPlainDateTime().equals(plain)) throw new Error();
    return zoned.toInstant().toString();
  } catch { throw new Error('This local time is invalid or occurs twice. Check the time zone and clock-change option.'); }
}
export function localRecordTime(at: string, timeZone: string) {
  const z = Temporal.Instant.from(at).toZonedDateTimeISO(timeZone);
  return { date: z.toPlainDate().toString(), time: z.toPlainTime().toString({ smallestUnit: 'minute' }) };
}
export function recordBasis(p: { product?: Product; doseBasis?: string }) { return p.product?.kind === 'blend' ? p.doseBasis === 'total' ? 'Total mixture' : p.product.components[Number(p.doseBasis)]?.name ?? '' : ''; }
export function exportRecordsCsv(records: ActualRecord[]) {
  const cell = (v: string) => `"${(/^[\s]*[=+\-@]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`;
  const rows = records.map(r => { const local = localRecordTime(r.occurredAt, r.timeZone); return [r.id, r.status, r.label, r.status === 'taken' ? r.dose : '', r.status === 'taken' ? r.unit : '', recordBasis(r), local.date, local.time, r.timeZone, r.occurredAt, r.scheduled?.protocolName ?? '', r.scheduled?.date ?? '', r.scheduled?.time ?? '', r.scheduled?.timeZone ?? '', r.scheduled?.dose ?? '', r.scheduled?.unit ?? '', r.scheduled?.label ?? '', r.scheduled ? recordBasis(r.scheduled) : '', r.notes]; });
  return '\uFEFF' + [['Record ID', 'Status', 'Product or item', 'Actual amount', 'Actual unit', 'Amount basis', 'Entry date', 'Entry time', 'Time zone', 'Entry instant', 'Schedule', 'Planned date', 'Planned time', 'Planned time zone', 'Planned amount', 'Planned unit', 'Planned label', 'Planned amount basis', 'Notes'], ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
