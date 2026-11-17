import { Temporal } from '@js-temporal/polyfill';
import { ui, uiError, browserLocale, localePath } from '../lib/i18n';
import { today } from '../lib/planner';
import { dailyEntries, exportRecordsCsv, localRecordTime, recordBasis, recordInstant, scheduledKey, validateRecord, validateScheduledEntry, type ActualRecord, type ScheduledEntry } from '../lib/records';
import { readWorkspace, saveRecord, deleteRecord } from '../lib/workspace';
import { productSummary, validateProduct, type Product } from '../lib/products';
import { takeLanguageDraft } from '../lib/language-draft';
import { track } from './analytics';

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
export function initToday() {
  const form = document.querySelector<HTMLFormElement>('#record-form'); if (!form) return;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const field = (id: string) => el<HTMLInputElement>(`record-${id}`);
  const viewDate = el<HTMLInputElement>('daily-date'), viewZone = el<HTMLSelectElement>('daily-zone');
  const editor = el('record-editor'), error = el('daily-error'), status = el('daily-status');
  let editing: ActualRecord | undefined, scheduled: ScheduledEntry | undefined, product: Product | undefined;
  let filtered: ActualRecord[] = [], shown = 50, dirty = false, writing = false;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const viewKey = 'peptide-tools.daily-view.v1';
  let followsToday = true;
  const zones = [...new Set(['UTC', browserZone, ...Intl.supportedValuesOf('timeZone')])].sort();
  function setZone(select: HTMLSelectElement, value: string) { if (![...select.options].some(o => o.value === value)) select.append(new Option(value, value)); select.value = value; }
  for (const select of [viewZone, el<HTMLSelectElement>('record-zone')]) { select.replaceChildren(...zones.map(z => new Option(z, z))); setZone(select, browserZone); }
  viewDate.value = today(viewZone.value);
  try {
    const saved = JSON.parse(sessionStorage.getItem(viewKey) ?? 'null');
    if (saved && zones.includes(saved.zone)) {
      viewZone.value = saved.zone; followsToday = saved.followsToday !== false;
      viewDate.value = followsToday ? today(viewZone.value) : saved.date;
      if (!viewDate.value || !viewDate.validity.valid) { followsToday = true; viewDate.value = today(viewZone.value); }
      for (const [id, value] of [['history-from', saved.from], ['history-until', saved.until]]) if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) el<HTMLInputElement>(id!).value = value;
    }
  } catch { /* View preferences never block local records. */ }
  function saveView() { try { sessionStorage.setItem(viewKey, JSON.stringify({ zone: viewZone.value, date: viewDate.value, followsToday, from: el<HTMLInputElement>('history-from').value, until: el<HTMLInputElement>('history-until').value })); } catch { /* Current-page view still works. */ } }
  const displayTime = (at: string) => { const d = localRecordTime(at, viewZone.value); return `${d.date} ${d.time}`; };
  function plannedText(s: ScheduledEntry) {
    const basis = recordBasis(s);
    return ui('Planned: {name}, {date} {time}, {zone}, {amount} {unit}.', { name: s.protocolName, date: s.date, time: s.time, zone: s.timeZone, amount: s.dose, unit: s.unit }) + (basis ? ' ' + ui('Planned amount basis: {basis}.', { basis: basis === 'Total mixture' ? ui(basis) : basis }) : '');
  }
  const button = (text: string, handler: () => void, cls = 'text-button') => { const b = node('button', ui(text), cls); b.type = 'button'; b.addEventListener('click', handler); return b; };
  function setProduct(p?: Product, basis = '') {
    product = p;
    const select = el<HTMLSelectElement>('record-product');
    if (p && ![...select.options].some(o => o.value === p.id)) select.append(new Option(p.name, p.id));
    select.value = p?.id ?? '';
    const choices = el<HTMLSelectElement>('record-basis'); choices.replaceChildren(new Option(ui('Choose an ingredient or total mixture'), ''));
    el('record-basis-wrap').hidden = p?.kind !== 'blend';
    if (p?.kind === 'blend') { p.components.forEach((c, n) => choices.append(new Option(c.name, String(n)))); choices.append(new Option(ui('Total mixture'), 'total')); choices.value = basis; }
  }
  function context() { field('context').value = editor.hidden ? '' : JSON.stringify({ editing, scheduled, product }); }
  function fillProducts() {
    const select = el<HTMLSelectElement>('record-product'); select.replaceChildren(new Option(ui('Custom item'), ''));
    for (const p of readWorkspace().products) select.append(new Option(p.name, p.id));
  }
  function setTime(at: string, zone: string) {
    setZone(el<HTMLSelectElement>('record-zone'), zone);
    const local = localRecordTime(at, zone); field('date').value = local.date; field('time').value = local.time;
    // Preserve the known instant when editing a record in a repeated hour.
    field('clock').value = recordInstant(local.date, local.time, zone, 'earlier') === Temporal.Instant.from(at).round({ smallestUnit: 'minute', roundingMode: 'floor' }).toString() ? 'earlier' : 'later';
  }
  function outcome() { el('record-amount-fields').hidden = field('outcome').value === 'skipped'; }
  function close() { editor.hidden = true; editing = undefined; scheduled = undefined; product = undefined; dirty = false; }
  function open(entry?: ScheduledEntry, record?: ActualRecord) {
    if (writing) return;
    if (dirty && !confirm(ui('Discard the unsaved record?'))) return;
    try {
      fillProducts(); form!.reset(); scheduled = entry ?? record?.scheduled; editing = record; setProduct(record?.product ?? scheduled?.product, record?.doseBasis ?? scheduled?.doseBasis);
      field('label').value = record?.label ?? scheduled?.label ?? '';
      field('dose').value = record?.dose ?? scheduled?.dose ?? '';
      field('unit').value = record?.unit ?? scheduled?.unit ?? 'mcg'; field('outcome').value = record?.status ?? 'taken'; field('notes').value = record?.notes ?? '';
      el<HTMLSelectElement>('record-product').disabled = !!scheduled || !!editing;
      const at = record?.occurredAt ?? (scheduled && scheduled.date !== today(scheduled.timeZone) ? scheduled.instant : new Date().toISOString());
      setTime(at, record?.timeZone ?? scheduled?.timeZone ?? viewZone.value);
      if (!record && !scheduled && field('date').value !== viewDate.value) { field('date').value = viewDate.value; field('clock').value = 'reject'; }
      el('record-editor-heading').textContent = ui(record ? 'Edit record' : 'Add a record');
      el('record-planned-context').textContent = scheduled ? plannedText(scheduled) : '';
      el('record-error').textContent = ''; editor.hidden = false; outcome(); context(); dirty = false;
      el('record-editor-heading').focus();
    } catch (e) { error.textContent = uiError(e); }
  }
  async function undo(r: ActualRecord) {
    if (!confirm(ui('Remove this actual record? The saved schedule is unchanged.'))) return;
    try { await deleteRecord(r.id, r.updatedAt); if (editing?.id === r.id) close(); track('record_removed', { record_source: r.scheduled ? 'scheduled' : 'manual' }); status.textContent = ui('Record removed. The saved schedule is unchanged.'); render(); }
    catch (e) { error.textContent = uiError(e); }
  }
  async function skip(entry: ScheduledEntry) {
    const now = new Date().toISOString();
    const record: ActualRecord = { id: crypto.randomUUID(), status: 'skipped', label: entry.label, dose: entry.dose, unit: entry.unit, occurredAt: entry.instant, timeZone: entry.timeZone, notes: '', createdAt: now, updatedAt: now, scheduled: entry, ...(entry.product ? { product: entry.product, ...(entry.doseBasis ? { doseBasis: entry.doseBasis } : {}) } : {}) };
    try { await saveRecord(record); track('record_saved', { operation: 'create', record_source: 'scheduled', record_status: 'skipped' }); status.textContent = ui('Skipped entry saved.'); render(); }
    catch (e) { error.textContent = uiError(e); }
  }
  function history(records = readWorkspace().records) {
    el('history-error').textContent = '';
    const from = el<HTMLInputElement>('history-from'), until = el<HTMLInputElement>('history-until');
    if (!from.validity.valid || !until.validity.valid || from.value && until.value && from.value > until.value) { el('history-error').textContent = ui('Choose a valid history date range.'); filtered = []; }
    else filtered = records.filter(r => { const date = localRecordTime(r.occurredAt, viewZone.value).date; return (!from.value || date >= from.value) && (!until.value || date <= until.value); }).sort((a, b) => Temporal.Instant.compare(b.occurredAt, a.occurredAt) || b.id.localeCompare(a.id));
    const list = document.createDocumentFragment();
    for (const r of filtered.slice(0, shown)) list.append(recordRow(r));
    el('history-entries').replaceChildren(list); el('history-empty').hidden = !!filtered.length || !!el('history-error').textContent;
    el('history-empty').textContent = ui(records.length ? 'No records match these dates.' : 'No records yet. Record an entry above or add a past entry.');
    el('history-more').hidden = filtered.length <= shown; el<HTMLButtonElement>('records-csv').disabled = !filtered.length;
  }
  function recordRow(r: ActualRecord) {
      const li = node('li'); li.dataset.recordId = r.id;
      const info = node('div', undefined, 'daily-entry-info'); info.append(node('h3', r.label), node('p', `${displayTime(r.occurredAt)} (${viewZone.value})`, 'small'), node('p', r.status === 'taken' ? `${ui('Taken')}: ${r.dose} ${r.unit}` : ui('Skipped')));
      const basis = recordBasis(r); if (basis) info.append(node('p', basis === 'Total mixture' ? ui(basis) : basis, 'small'));
      if (r.scheduled) info.append(node('p', plannedText(r.scheduled), 'small'));
      else info.append(node('p', ui('Manual record'), 'small'));
      if (r.notes) info.append(node('p', r.notes, 'record-note'));
      if (r.product) {
        const detail = node('details', undefined, 'optional-help'); detail.append(node('summary', ui('Product label in this record')));
        detail.append(node('p', r.product.name), node('p', r.product.brand), node('p', productSummary(r.product, browserLocale())));
        detail.append(node('p', r.product.concentrationMgMl ? `${ui('Concentration')}: ${r.product.concentrationMgMl} mg/mL` : ui('Concentration not added'), 'small'));
        if (r.product.kind === 'blend') for (const c of r.product.components) detail.append(node('p', `${c.name}: ${c.amountMg || ui('Not provided')} mg`, 'small'));
        info.append(detail);
      }
      const actions = node('div', undefined, 'actions'); actions.append(button('Edit record', () => open(undefined, r)), button('Remove record', () => undo(r))); li.append(info, actions); return li;
  }
  function render() {
    error.textContent = '';
    try {
      const data = readWorkspace();
      if (!viewDate.value || !viewDate.validity.valid) throw new Error('Choose a valid view date.');
      const { entries, unavailable } = dailyEntries(data.protocols, viewDate.value, viewZone.value);
      const completed = new Map(data.records.flatMap(r => r.scheduled ? [[scheduledKey(r.scheduled), r] as const] : []));
      const list = document.createDocumentFragment();
      for (const entry of entries) {
        const r = completed.get(scheduledKey(entry)), li = node('li'); li.dataset.scheduledKey = scheduledKey(entry);
        const info = node('div', undefined, 'daily-entry-info'); info.append(node('h3', entry.label), node('p', `${localRecordTime(entry.instant, viewZone.value).time} (${viewZone.value})`), node('p', `${entry.dose} ${entry.unit}`, 'daily-amount'), node('p', entry.protocolName, 'small'));
        const basis = recordBasis(entry); if (basis) info.append(node('p', basis === 'Total mixture' ? ui(basis) : basis, 'small'));
        if (entry.timeZone !== viewZone.value) info.append(node('p', `${entry.date} ${entry.time} (${entry.timeZone})`, 'small'));
        const actions = node('div', undefined, 'actions');
        if (r) {
          info.append(node('p', r.status === 'taken' ? ui('Recorded: {amount} {unit}, {time}.', { amount: r.dose, unit: r.unit, time: displayTime(r.occurredAt) }) : ui('Skipped'), 'record-outcome'));
          if (r.scheduled && JSON.stringify(r.scheduled) !== JSON.stringify(entry)) info.append(node('p', ui('The plan changed. This record keeps its original planned details.'), 'small'));
          actions.append(button('Edit record', () => open(undefined, r)), button('Undo record', () => undo(r)));
        } else actions.append(button('Record', () => open(entry), 'button secondary'), button('Skip', () => skip(entry)));
        li.append(info, actions); list.append(li);
      }
      el('daily-entries').replaceChildren(list); el('daily-empty').hidden = entries.length > 0;
      const keys = new Set(entries.map(scheduledKey));
      const extra = data.records.filter(r => localRecordTime(r.occurredAt, viewZone.value).date === viewDate.value && (!r.scheduled || !keys.has(scheduledKey(r.scheduled)) || r.scheduled.date !== localRecordTime(r.occurredAt, r.scheduled.timeZone).date));
      el('daily-extra-entries').replaceChildren(...extra.sort((a, b) => Temporal.Instant.compare(a.occurredAt, b.occurredAt)).map(recordRow)); el('daily-extra').hidden = !extra.length;
      if (unavailable.length) error.textContent = ui('Some schedules could not be shown. Check their dates and clock-change times: {names}', { names: unavailable.join(', ') });
      history(data.records); el<HTMLButtonElement>('record-new').disabled = writing; el<HTMLButtonElement>('record-save').disabled = writing;
    } catch (e) { el('daily-entries').replaceChildren(); el('history-entries').replaceChildren(); el('daily-extra').hidden = true; el('daily-empty').hidden = true; el('history-empty').hidden = true; el<HTMLButtonElement>('records-csv').disabled = true; el<HTMLButtonElement>('record-new').disabled = true; error.textContent = uiError(e); }
  }
  form.addEventListener('input', () => { dirty = true; });
  for (const id of ['date', 'time', 'zone']) field(id).addEventListener('change', () => { field('clock').value = 'reject'; });
  field('outcome').addEventListener('change', outcome);
  el('record-product').addEventListener('change', () => { try { setProduct(readWorkspace().products.find(p => p.id === field('product').value)); if (product) field('label').value = product.name; field('dose').value = ''; context(); } catch (e) { el('record-error').textContent = uiError(e); } });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (writing || editor.hidden) return; writing = true; el<HTMLButtonElement>('record-save').disabled = true; el<HTMLButtonElement>('record-new').disabled = true; el<HTMLButtonElement>('record-cancel').disabled = true; el('record-save').setAttribute('aria-busy', 'true'); el('record-error').textContent = '';
    try {
      const occurredAt = recordInstant(field('date').value, field('time').value, field('zone').value, field('clock').value as 'reject' | 'earlier' | 'later');
      const taken = field('outcome').value === 'taken';
      if (taken && Temporal.Instant.compare(occurredAt, Temporal.Now.instant()) > 0) throw new Error('An actual record cannot be in the future. Check the date, time and time zone.');
      const now = new Date().toISOString(), updatedAt = editing && now <= editing.updatedAt ? Temporal.Instant.from(editing.updatedAt).add({ milliseconds: 1 }).toString() : now;
      const record = validateRecord({ id: editing?.id ?? crypto.randomUUID(), status: field('outcome').value, label: field('label').value, dose: taken ? field('dose').value : '', unit: field('unit').value, occurredAt, timeZone: field('zone').value, notes: field('notes').value, createdAt: editing?.createdAt ?? now, updatedAt, ...(scheduled ? { scheduled } : {}), ...(product ? { product, ...(product.kind === 'blend' ? { doseBasis: field('basis').value } : {}) } : {}) });
      const operation = editing ? 'update' : 'create'; form!.inert = true; await saveRecord(record, editing?.updatedAt); close();
      track('record_saved', { operation, record_source: record.scheduled ? 'scheduled' : 'manual', record_status: record.status }); status.textContent = ui('Actual record saved.'); render(); el('daily-status').tabIndex = -1; el('daily-status').focus();
    } catch (e) { form!.inert = false; el('record-error').textContent = uiError(e); el('record-error').tabIndex = -1; el('record-error').focus(); }
    finally { writing = false; form!.inert = false; render(); el<HTMLButtonElement>('record-save').disabled = false; el<HTMLButtonElement>('record-cancel').disabled = false; el('record-save').removeAttribute('aria-busy'); }
  });
  el('record-new').addEventListener('click', () => open());
  el('record-cancel').addEventListener('click', () => { if (!dirty || confirm(ui('Discard the unsaved record?'))) { close(); el('record-new').focus(); } });
  viewDate.addEventListener('change', () => { followsToday = viewDate.value === today(viewZone.value); saveView(); status.textContent = ''; render(); });
  viewZone.addEventListener('change', () => { if (followsToday) viewDate.value = today(viewZone.value); saveView(); status.textContent = ''; render(); });
  for (const [id, step] of [['daily-previous', -1], ['daily-next', 1]] as const) el(id).addEventListener('click', () => { try { viewDate.value = Temporal.PlainDate.from(viewDate.value).add({ days: step }).toString(); followsToday = viewDate.value === today(viewZone.value); saveView(); render(); } catch { error.textContent = ui('Choose a valid view date.'); } });
  el('daily-now').addEventListener('click', () => { viewDate.value = today(viewZone.value); followsToday = true; saveView(); render(); });
  for (const id of ['history-from', 'history-until']) el(id).addEventListener('change', () => { shown = 50; saveView(); render(); });
  el('history-reset').addEventListener('click', () => { el<HTMLInputElement>('history-from').value = ''; el<HTMLInputElement>('history-until').value = ''; shown = 50; saveView(); render(); });
  el('history-more').addEventListener('click', () => { shown += 50; render(); });
  el('records-csv').addEventListener('click', () => {
    try { history(); if (!filtered.length) return; const url = URL.createObjectURL(new Blob([exportRecordsCsv(filtered)], { type: 'text/csv;charset=utf-8' })); const a = node('a'); a.href = url; a.download = 'peptide-tools-records.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); track('export_completed', { export_type: 'csv' }); status.textContent = ui('CSV download requested.'); } catch (e) { error.textContent = uiError(e); }
  });
  window.addEventListener('workspace-changed', render); window.addEventListener('storage', render);
  window.addEventListener('workspace-restored', () => { close(); render(); });
  function refreshToday() { if (followsToday && viewDate.value !== today(viewZone.value)) { viewDate.value = today(viewZone.value); saveView(); render(); } }
  setInterval(refreshToday, 30000); window.addEventListener('focus', refreshToday); document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
  window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-language]')) a.addEventListener('click', event => { if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) || a.dataset.language === browserLocale()) return; context(); dirty = false; }, { capture: true });
  render();
  const draft = takeLanguageDraft();
  if (draft?.values.recordContext) {
    try {
      const c = JSON.parse(draft.values.recordContext); const record = c.editing ? validateRecord(c.editing) : undefined, entry = c.scheduled ? validateScheduledEntry(c.scheduled) : undefined;
      open(entry, record); if (c.product) setProduct(validateProduct(c.product), draft.values.recordBasis);
      for (const [name, value] of Object.entries(draft.values)) { const f = form.elements.namedItem(name) as HTMLInputElement | null; if (f && name !== 'recordContext') { if (name === 'recordZone') setZone(f as unknown as HTMLSelectElement, value); else f.value = value; } }
      outcome(); context(); dirty = true;
    } catch { error.textContent = ui('The record draft could not be restored. Saved records are unchanged.'); }
  }
  document.querySelector<HTMLAnchorElement>('[data-today-planner]')?.setAttribute('href', localePath('/planner', browserLocale()));
}
