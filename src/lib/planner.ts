import { Temporal } from '@js-temporal/polyfill';
import { positiveDecimal, type DoseUnit } from './calculator';
import { validateProduct, type Product } from './products';

export type Frequency = { kind: 'daily' | 'alternate' | 'weekdays' | 'interval'; weekdays?: number[]; interval?: number };
export interface ProtocolItem { id: string; label: string; dose: string; unit: DoseUnit; time: string; frequency: Frequency; product?: Product; doseBasis?: string }
export interface Protocol { id: string; name: string; timeZone: string; startDate: string; endDate: string; items: ProtocolItem[] }
export interface Occurrence { id: string; itemId: string; date: string; time: string; label: string; dose: string; unit: DoseUnit; instant: string }
export const MAX_DAYS = 366;
export const MAX_ITEMS = 20;
export class PlannerError extends Error {}
function text(v: unknown, max: number): v is string { return typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v); }
function isoDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PlannerError('Choose valid start and end dates.');
  try { return Temporal.PlainDate.from(value); } catch { throw new PlannerError('Choose valid start and end dates.'); }
}
export function validateProtocol(value: unknown): Protocol {
  if (!value || typeof value !== 'object') throw new PlannerError('The protocol format is invalid.');
  const p = value as Record<string, unknown>;
  if (!text(p.id, 80) || !/^[\w-]+$/.test(p.id) || !text(p.name, 80)) throw new PlannerError('Use a protocol name between 1 and 80 characters.');
  if (!text(p.timeZone, 100)) throw new PlannerError('Choose a valid time zone.');
  try { new Intl.DateTimeFormat('en', { timeZone: p.timeZone }); } catch { throw new PlannerError('Choose a valid time zone.'); }
  const start = isoDate(p.startDate), end = isoDate(p.endDate);
  const days = start.until(end).days;
  if (days < 0 || days >= MAX_DAYS || start.year < 2000 || end.year > 2100) throw new PlannerError('Use a cycle of 1 to 366 days between 2000 and 2100.');
  if (!Array.isArray(p.items) || p.items.length < 1 || p.items.length > MAX_ITEMS) throw new PlannerError('Add between 1 and 20 schedule items.');
  const ids = new Set<string>();
  const items = p.items.map((raw: unknown): ProtocolItem => {
    if (!raw || typeof raw !== 'object') throw new PlannerError('A schedule item is invalid.');
    const i = raw as Record<string, unknown>;
    if (!text(i.id, 80) || !/^[\w-]+$/.test(i.id) || ids.has(i.id)) throw new PlannerError('Schedule item identifiers must be unique.');
    ids.add(i.id);
    if (!text(i.label, 80)) throw new PlannerError('Give each item a name of 1 to 80 characters.');
    if (typeof i.dose !== 'string') throw new PlannerError('Enter a positive dose for each item.');
    try { positiveDecimal(i.dose); } catch { throw new PlannerError('Enter a positive decimal dose for each item.'); }
    if (i.unit !== 'mg' && i.unit !== 'mcg') throw new PlannerError('Select mg or mcg for each item.');
    if (typeof i.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(i.time)) throw new PlannerError('Choose a valid time for each item.');
    if (!i.frequency || typeof i.frequency !== 'object') throw new PlannerError('Choose a repeat rule for each item.');
    const f = i.frequency as Record<string, unknown>;
    if (!['daily', 'alternate', 'weekdays', 'interval'].includes(String(f.kind))) throw new PlannerError('Choose a supported repeat rule.');
    const frequency: Frequency = { kind: f.kind as Frequency['kind'] };
    if (f.kind === 'interval') {
      if (!Number.isInteger(f.interval) || Number(f.interval) < 1 || Number(f.interval) > 366) throw new PlannerError('Repeat interval must be 1 to 366 days.');
      frequency.interval = Number(f.interval);
    }
    if (f.kind === 'weekdays') {
      if (!Array.isArray(f.weekdays) || !f.weekdays.length || f.weekdays.length > 7 || f.weekdays.some(d => !Number.isInteger(d) || d < 1 || d > 7)) throw new PlannerError('Select at least one weekday.');
      frequency.weekdays = [...new Set(f.weekdays as number[])].sort();
    }
    const product = i.product === undefined ? undefined : validateProduct(i.product);
    let doseBasis: string | undefined;
    if (product?.kind === 'blend') {
      if (i.doseBasis !== 'total' && (typeof i.doseBasis !== 'string' || !/^\d+$/.test(i.doseBasis) || !product.components[Number(i.doseBasis)])) throw new PlannerError('Choose which ingredient or total mixture your planned amount refers to.');
      doseBasis = i.doseBasis as string;
    }
    return { id: i.id, label: i.label.trim(), dose: i.dose.trim(), unit: i.unit, time: i.time, frequency, ...(product ? { product, ...(doseBasis ? { doseBasis } : {}) } : {}) };
  });
  return { id: p.id, name: p.name.trim(), timeZone: p.timeZone, startDate: start.toString(), endDate: end.toString(), items };
}
export function generateSchedule(input: Protocol): Occurrence[] {
  const p = validateProtocol(input);
  return generateRange(p, Temporal.PlainDate.from(p.startDate), Temporal.PlainDate.from(p.endDate));
}
function generateRange(p: Protocol, from: Temporal.PlainDate, end: Temporal.PlainDate): Occurrence[] {
  const start = Temporal.PlainDate.from(p.startDate);
  const result: Occurrence[] = [];
  for (let date = from; Temporal.PlainDate.compare(date, end) <= 0; date = date.add({ days: 1 })) {
    const offset = start.until(date).days;
    for (const item of p.items) {
      const f = item.frequency;
      const matches = f.kind === 'daily' || (f.kind === 'alternate' && offset % 2 === 0) || (f.kind === 'interval' && offset % f.interval! === 0) || (f.kind === 'weekdays' && f.weekdays!.includes(date.dayOfWeek));
      if (!matches) continue;
      const time = Temporal.PlainTime.from(item.time);
      const zoned = date.toZonedDateTime({ timeZone: p.timeZone, plainTime: time });
      if (!zoned.toPlainTime().equals(time)) throw new PlannerError(`${date.toString()} at ${item.time} does not exist in ${p.timeZone} because of a clock change. Choose another time.`);
      result.push({ id: `${p.id}-${item.id}-${date.toString()}`, itemId: item.id, date: date.toString(), time: item.time, label: item.label, dose: item.dose, unit: item.unit, instant: zoned.toInstant().toString() });
    }
  }
  return result.sort((a, b) => a.instant.localeCompare(b.instant) || a.itemId.localeCompare(b.itemId));
}
/** A reporting day is a half-open interval of instants, including on 23/25-hour days. */
export function occurrencesOnDate(input: Protocol, date: string, timeZone: string): Occurrence[] {
  const p = validateProtocol(input), day = isoDate(date);
  const begin = day.toZonedDateTime(timeZone).toInstant();
  const finish = day.add({ days: 1 }).toZonedDateTime(timeZone).toInstant();
  let from = begin.toZonedDateTimeISO(p.timeZone).toPlainDate();
  let to = finish.subtract({ nanoseconds: 1 }).toZonedDateTimeISO(p.timeZone).toPlainDate();
  const start = Temporal.PlainDate.from(p.startDate), end = Temporal.PlainDate.from(p.endDate);
  if (Temporal.PlainDate.compare(from, start) < 0) from = start;
  if (Temporal.PlainDate.compare(to, end) > 0) to = end;
  return generateRange(p, from, to).filter(e => Temporal.Instant.compare(e.instant, begin) >= 0 && Temporal.Instant.compare(e.instant, finish) < 0);
}
export function calendarMonth(month: string): string[] {
  const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
  const monday = first.subtract({ days: first.dayOfWeek - 1 });
  return Array.from({ length: 42 }, (_, n) => monday.add({ days: n }).toString());
}
export function today(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) { return Temporal.Now.plainDateISO(timeZone).toString(); }
export function endAfter(start: string, days: number) { return Temporal.PlainDate.from(start).add({ days }).toString(); }
