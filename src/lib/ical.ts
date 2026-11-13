import type { Protocol, Occurrence } from './planner';
import { formatMessage, type Locale } from './i18n';
import { productSummary } from './products';
function escape(value: string) { return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
function utc(value: string) { return value.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let part = '', length = 0;
  const parts: string[] = [];
  for (const c of line) {
    const bytes = encoder.encode(c).length;
    if (length + bytes > 75) { parts.push(part); part = ' '; length = 1; }
    part += c; length += bytes;
  }
  parts.push(part);
  return parts.join('\r\n');
}
export function exportCalendar(protocol: Protocol, occurrences: Occurrence[], now = new Date(), locale: Locale = 'en'): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Peptide Tools//Local planner//EN', 'CALSCALE:GREGORIAN'];
  for (const event of occurrences) {
    const item = protocol.items.find(i => i.id === event.itemId);
    const basis = item?.product?.kind === 'blend' ? (item.doseBasis === 'total' ? formatMessage('Total mixture', locale) : item.product.components[Number(item.doseBasis)]?.name ?? '') : '';
    const productContext = item?.product ? ` ${item.product.name}: ${productSummary(item.product, locale)}. ${basis}` : '';
    lines.push(
    'BEGIN:VEVENT', `UID:${event.id}@peptides.ybwdaisy.com`, `DTSTAMP:${utc(now.toISOString())}`, `DTSTART:${utc(event.instant)}`,
    `SUMMARY:${escape(`${event.label}${basis ? ` (${basis})` : ''}: ${event.dose} ${event.unit}`)}`,
    `DESCRIPTION:${escape(`${protocol.name}. ${formatMessage('User-entered schedule, not a dose recommendation. Time zone: {zone}.', locale, { zone: protocol.timeZone })}${productContext}`)}`, 'END:VEVENT',
  );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
