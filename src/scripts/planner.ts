import { takeLanguageDraft, type DraftItem } from '../lib/language-draft';
import { ui, uiError, browserLocale } from '../lib/i18n';
import { Temporal } from '@js-temporal/polyfill';
import { calendarMonth, generateSchedule, today, validateProtocol, type Protocol, type ProtocolItem, type Occurrence, type Frequency } from '../lib/planner';
import { parseBackup, serializeBackup, STORAGE_KEY } from '../lib/backup';
import { exportCalendar } from '../lib/ical';
import { track, trackStart } from './analytics';

function download(text: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node;
}
export function initPlanner() {
  const form = document.querySelector<HTMLFormElement>('#planner-form');
  if (!form) return;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const items = el('protocol-items');
  const error = el('planner-error'), status = el('planner-status'), storageStatus = el('storage-status');
  let protocols: Protocol[] = [], editingId: string = crypto.randomUUID(), current: Protocol | undefined, events: Occurrence[] = [], shown = 100;
  let unreadableSavedData = false;
  const zone = el<HTMLSelectElement>('time-zone');
  const zones = [...new Set(['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone, ...Intl.supportedValuesOf('timeZone')])].sort();
  zone.replaceChildren(...zones.map(z => { const option = element('option', z); option.value = z; return option; }));
  zone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  input('startDate').value = today(zone.value);

  function dirty() {
    trackStart('planner_start'); current = undefined; events = [];
    el('generated-calendar').hidden = true; el('calendar-empty').hidden = false;
    error.textContent = ''; status.textContent = '';
    form!.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  }
  function addItem(data?: ProtocolItem, draft?: DraftItem) {
    if (items.children.length >= 20) { error.textContent = ui('A protocol supports up to 20 items.'); return; }
    const fragment = (el<HTMLTemplateElement>('protocol-item-template')).content.cloneNode(true) as DocumentFragment;
    const row = fragment.querySelector<HTMLFieldSetElement>('fieldset')!;
    const id = data?.id ?? (draft?.id && /^[\w-]{1,80}$/.test(draft.id) ? draft.id : crypto.randomUUID()); row.dataset.id = id;
    row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach(field => {
      field.id = `item-${id}-${field.dataset.field}`; field.name = field.id;
      row.querySelector(`[data-label-for="${field.dataset.field}"]`)?.setAttribute('for', field.id);
      if (data && ['label','dose','unit','time'].includes(field.dataset.field!)) field.value = String(data[field.dataset.field as keyof ProtocolItem]);
    });
    const frequency = row.querySelector<HTMLSelectElement>('[data-field="frequency"]')!;
    const interval = row.querySelector<HTMLInputElement>('[data-field="interval"]')!;
    function showRule() {
      row.querySelector<HTMLElement>('[data-interval-section]')!.hidden = frequency.value !== 'interval';
      interval.disabled = frequency.value !== 'interval';
      row.querySelector<HTMLElement>('[data-weekdays-section]')!.hidden = frequency.value !== 'weekdays';
      row.querySelectorAll<HTMLInputElement>('[data-weekday]').forEach(c => { c.disabled = frequency.value !== 'weekdays'; });
    }
    if (data) {
      frequency.value = data.frequency.kind;
      if (data.frequency.interval) interval.value = String(data.frequency.interval);
      row.querySelectorAll<HTMLInputElement>('[data-weekday]').forEach(c => c.checked = data.frequency.weekdays?.includes(Number(c.value)) ?? false);
    }
    if (draft) {
      row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach(field => { const value = draft[field.dataset.field!]; if (typeof value === 'string') field.value = value; });
      row.querySelectorAll<HTMLInputElement>('[data-weekday]').forEach(field => field.checked = draft.weekdays?.split(',').includes(field.value) ?? false);
    }
    showRule(); frequency.addEventListener('change', showRule);
    row.querySelector('[data-remove]')!.addEventListener('click', () => {
      if (row.querySelector<HTMLInputElement>('[data-field="label"]')!.value && !confirm(ui('Remove this item from the unsaved form?'))) return;
      row.remove(); renumber(); dirty(); el<HTMLButtonElement>('add-item').focus();
    });
    items.append(fragment); renumber();
  }
  function renumber() {
    items.querySelectorAll('[data-item-title]').forEach((title, n) => title.textContent = ui('Schedule item {number}', { number: n + 1 }));
    el<HTMLButtonElement>('add-item').disabled = items.children.length >= 20;
  }
  function readForm(): Protocol {
    const data: ProtocolItem[] = Array.from(items.querySelectorAll<HTMLFieldSetElement>('.protocol-item')).map(row => {
      const val = (field: string) => row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${field}"]`)!.value;
      const kind = val('frequency') as Frequency['kind'];
      return { id: row.dataset.id!, label: val('label'), dose: val('dose'), unit: val('unit') as ProtocolItem['unit'], time: val('time'), frequency: { kind, ...(kind === 'interval' ? { interval: Number(val('interval')) } : {}), ...(kind === 'weekdays' ? { weekdays: Array.from(row.querySelectorAll<HTMLInputElement>('[data-weekday]:checked')).map(c => Number(c.value)) } : {}) } };
    });
    return validateProtocol({ id: editingId, name: input('protocolName').value, timeZone: zone.value, startDate: input('startDate').value, endDate: input('endDate').value, items: data });
  }
  function showError(e: unknown) {
    error.textContent = uiError(e);
    const first = form!.querySelector<HTMLInputElement>('input[required]:invalid, input[required]:placeholder-shown');
    if (first) { first.setAttribute('aria-invalid', 'true'); first.focus(); }
    else { error.tabIndex = -1; error.focus(); }
  }
  function rows(limit: number) {
    const fragment = document.createDocumentFragment();
    for (const event of events.slice(0, limit)) {
      const tr = element('tr'); tr.append(element('td', `${event.date} ${event.time}`), element('td', event.label), element('td', `${event.dose} ${event.unit}`)); fragment.append(tr);
    }
    el('schedule-rows').replaceChildren(fragment);
    el('show-more').hidden = limit >= events.length;
    el('show-more').textContent = ui('Show more entries ({shown} of {total})', { shown: Math.min(limit, events.length), total: events.length });
  }
  function renderMonth() {
    const month = el<HTMLSelectElement>('calendar-month').value;
    if (!month || !current) return;
    const fragment = document.createDocumentFragment();
    const byDate = new Map<string, Occurrence[]>();
    for (const entry of events) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
    for (const date of calendarMonth(month)) {
      const entries = byDate.get(date) ?? [];
      const cell = element('div', undefined, `calendar-day${date.startsWith(month) ? '' : ' outside-month'}${entries.length ? '' : ' no-events'}`);
      const time = element('time', new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))); time.dateTime = date; cell.append(time);
      for (const entry of entries) { const line = element('div', undefined, 'calendar-event'); line.append(element('strong', `${entry.time} ${entry.label}`), element('span', `${entry.dose} ${entry.unit}`)); cell.append(line); }
      fragment.append(cell);
    }
    el('calendar-grid').replaceChildren(fragment);
  }
  function showSchedule(p: Protocol) {
    const generated = generateSchedule(p);
    if (!generated.length) throw new Error('No dates match these repeat rules. Adjust your dates or selected weekdays.');
    current = p; events = generated; shown = 100;
    const monthSelect = el<HTMLSelectElement>('calendar-month'); monthSelect.replaceChildren();
    let month = Temporal.PlainYearMonth.from(p.startDate.slice(0, 7));
    const last = p.endDate.slice(0, 7);
    while (month.toString() <= last) { const label = new Intl.DateTimeFormat(document.documentElement.lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.toString()}-01T12:00:00Z`)); const option = element('option', label); option.value = month.toString(); monthSelect.append(option); month = month.add({ months: 1 }); }
    el('calendar-title').textContent = p.name;
    el('calendar-summary').textContent = ui('{count} entries, {start} to {end}, {zone}', { count: events.length, start: p.startDate, end: p.endDate, zone: p.timeZone });
    el('print-title').textContent = p.name; el('print-context').textContent = ui('{start} to {end}. Time zone: {zone}.', { start: p.startDate, end: p.endDate, zone: p.timeZone });
    el('calendar-empty').hidden = true; el('generated-calendar').hidden = false;
    rows(shown); renderMonth();
  }
  function persist(list: Protocol[], confirmedReplacement = false) {
    if (unreadableSavedData && !confirmedReplacement) throw new Error('Unreadable saved data must be restored or cleared before saving.');
    localStorage.setItem(STORAGE_KEY, serializeBackup(list));
    unreadableSavedData = false; protocols = list; renderSaved();
  }
  function renderSaved() {
    el('saved-empty').hidden = protocols.length > 0;
    el<HTMLButtonElement>('backup-export').disabled = !protocols.length;
    const fragment = document.createDocumentFragment();
    for (const p of protocols) {
      const li = element('li'); const open = element('button', p.name, 'text-button'); open.type = 'button';
      open.addEventListener('click', () => {
        if ((input('protocolName').value || items.querySelector<HTMLInputElement>('[data-field="label"]')?.value) && !current && !confirm(ui('Replace the unsaved form with this saved protocol?'))) return;
        editingId = p.id; form!.dataset.editingId = editingId; input('protocolName').value = p.name; zone.value = p.timeZone;
        if (!zone.value) { const option = element('option', p.timeZone); option.value = p.timeZone; zone.append(option); zone.value = p.timeZone; }
        input('startDate').value = p.startDate; input('endDate').value = p.endDate; items.replaceChildren(); p.items.forEach(item => addItem(item)); error.textContent = ''; status.textContent = ui('Loaded from this browser. No usage event was recorded for loading.');
        try { showSchedule(p); } catch (e) { current = undefined; el('generated-calendar').hidden = true; el('calendar-empty').hidden = false; showError(e); }
      });
      const remove = element('button', ui('Delete'), 'text-button'); remove.type = 'button'; remove.setAttribute('aria-label', ui('Delete saved protocol {name}', { name: p.name }));
      remove.addEventListener('click', () => { if (!confirm(ui('Delete “{name}” from this browser?', { name: p.name }))) return; try { persist(protocols.filter(x => x.id !== p.id)); storageStatus.textContent = ui('Saved protocol deleted. The open form is unchanged.'); } catch { storageStatus.textContent = ui('Storage is unavailable. Nothing was deleted.'); } });
      const actions = element('div', undefined, 'actions'); actions.append(open, remove); li.append(actions); fragment.append(li);
    }
    el('saved-list').replaceChildren(fragment);
  }
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) protocols = parseBackup(raw).protocols; }
  catch { unreadableSavedData = true; storageStatus.textContent = ui('Saved data could not be read. It has not been overwritten. Restore a valid backup or clear saved protocols before saving new entries.'); }
  renderSaved();
  const draft = takeLanguageDraft();
  if (draft) {
    if (draft.editingId && /^[\w-]{1,80}$/.test(draft.editingId)) editingId = draft.editingId;
    for (const name of ['protocolName', 'timeZone', 'startDate', 'endDate']) {
      if (typeof draft.values[name] === 'string') input(name).value = draft.values[name];
    }
    if (draft.items.length) draft.items.forEach(item => addItem(undefined, item)); else addItem();
    if (draft.generated) { try { showSchedule(readForm()); } catch { /* Keep incomplete inputs available without recording an action. */ } }
  } else addItem();
  form.dataset.editingId = editingId;
  form.addEventListener('input', dirty); form.addEventListener('change', dirty);
  el('add-item').addEventListener('click', () => { dirty(); addItem(); items.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); error.textContent = ''; trackStart('planner_start'); try { showSchedule(readForm()); track('schedule_generated'); status.textContent = ui('Calendar generated from your entries. Save it separately to keep it in this browser.'); } catch (e) { showError(e); } });
  el('save-protocol').addEventListener('click', () => {
    error.textContent = ''; trackStart('planner_start');
    if (unreadableSavedData) { error.textContent = ui('Existing saved data could not be read. Restore a valid backup or explicitly clear saved protocols before saving. Nothing has been overwritten.'); return; }
    let p: Protocol;
    try { p = readForm(); const check = generateSchedule(p); if (!check.length) throw new Error('No dates match this schedule. Adjust the dates or repeat rules.'); } catch (e) { showError(e); return; }
    if (!protocols.some(x => x.id === p.id) && protocols.length >= 20) { error.textContent = ui('This browser holds 20 protocols. Delete one before saving another.'); return; }
    try { persist([...protocols.filter(x => x.id !== p.id), p]); status.textContent = ui('Saved in this browser. Download a JSON backup to keep a separate copy.'); track('protocol_saved'); } catch { error.textContent = ui('Local storage is unavailable or full. Your form is still here; generate a calendar and export it, or enable browser storage before saving.'); }
  });
  el('new-protocol').addEventListener('click', () => {
    if (!confirm(ui('Clear the open form and start a new protocol? Saved protocols will remain.'))) return;
    form.reset(); editingId = crypto.randomUUID(); form.dataset.editingId = editingId; zone.value = Intl.DateTimeFormat().resolvedOptions().timeZone; input('startDate').value = today(zone.value); items.replaceChildren(); addItem(); dirty(); input('protocolName').focus();
  });
  el('calendar-month').addEventListener('change', renderMonth);
  el('show-more').addEventListener('click', () => { shown += 100; rows(shown); });
  el('export-ics').addEventListener('click', () => { if (!current) return; download(exportCalendar(current, events, new Date(), browserLocale()), 'text/calendar;charset=utf-8', 'peptide-tools-calendar.ics'); track('export_completed', { export_type: 'ics' }); });
  el('backup-export').addEventListener('click', () => { if (!protocols.length) return; download(serializeBackup(protocols), 'application/json', 'peptide-tools-backup.json'); track('export_completed', { export_type: 'json' }); });
  el<HTMLInputElement>('backup-import').addEventListener('change', async event => {
    const field = event.target as HTMLInputElement, file = field.files?.[0]; if (!file) return;
    try { if (file.size > 1024 * 1024) throw new Error('Use a backup smaller than 1 MB.'); const data = parseBackup(await file.text()); if (!confirm(ui('Replace all saved protocols in this browser with {count} protocol(s) from this backup?', { count: data.protocols.length }))) return; persist(data.protocols, true); storageStatus.textContent = ui('Backup restored. Open a saved protocol to view it. The open form has not changed.'); }
    catch (e) { storageStatus.textContent = ui('Restore failed: {message}', { message: uiError(e) }); }
    finally { field.value = ''; }
  });
  el('clear-data').addEventListener('click', () => { if (!confirm(ui('Delete all saved protocols from this browser? Download a backup first if you need a copy.'))) return; try { localStorage.removeItem(STORAGE_KEY); unreadableSavedData = false; protocols = []; renderSaved(); storageStatus.textContent = ui('Saved protocols cleared. The open form and downloaded files are unchanged.'); } catch { storageStatus.textContent = ui('Storage is unavailable. Saved data could not be cleared.'); } });
  el('print-calendar').addEventListener('click', () => { if (current) { rows(events.length); track('print_requested'); window.print(); } });
  window.addEventListener('beforeprint', () => { if (current) rows(events.length); });
  window.addEventListener('afterprint', () => { if (current) rows(shown); });
}
