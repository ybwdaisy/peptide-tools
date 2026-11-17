import { parseBackup, BACKUP_STATUS_KEY, MAX_BACKUP_BYTES, type Backup } from '../lib/backup';
import { exportWorkspace, readWorkspace, replaceWorkspace } from '../lib/workspace';
import { browserLocale, ui, uiError } from '../lib/i18n';
import { track } from './analytics';

async function digest(raw: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))).map(b => b.toString(16).padStart(2, '0')).join(''); }
export function initBackupControls() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-backup-controls]')) {
    if (root.dataset.bound) continue; root.dataset.bound = 'true';
    const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const status = document.getElementById(root.dataset.statusId!)!;
    const button = find<HTMLButtonElement>('[data-backup-export]'), input = find<HTMLInputElement>('[data-backup-import]');
    const preview = find<HTMLElement>('[data-restore-preview]'), state = find<HTMLElement>('[data-backup-state]');
    let pending: { raw: string; data: Backup } | undefined, generation = 0, refreshId = 0;
    async function refresh() {
      const request = ++refreshId; let readable = false;
      try {
        const workspace = readWorkspace(); readable = true;
        const empty = !(workspace.products.length || workspace.protocols.length || workspace.calculations.length || workspace.records.length);
        button.disabled = empty; state.textContent = empty ? '' : ui('No backup download requested yet.');
        let meta; try { meta = JSON.parse(localStorage.getItem(BACKUP_STATUS_KEY) ?? 'null'); } catch { meta = null; }
        if (!empty && meta && typeof meta.digest === 'string' && /^[a-f0-9]{64}$/.test(meta.digest) && Number.isFinite(meta.at) && meta.at > 0 && meta.at <= Date.now()) {
          const same = await digest(exportWorkspace()) === meta.digest;
          if (request !== refreshId) return;
          const date = new Intl.DateTimeFormat(browserLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meta.at));
          state.textContent = ui('Backup download requested: {date}.', { date }) + (same ? '' : ' ' + ui('Local data changed since that request.'));
        }
      } catch { button.disabled = !readable; state.textContent = ui('Backup status unavailable. Check local storage.'); }
    }
    function cancel(clearInput = true) { generation++; pending = undefined; preview.hidden = true; if (clearInput) input.value = ''; }
    button.addEventListener('click', async () => {
      try {
        const raw = exportWorkspace(), url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'peptide-tools-backup.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        const at = Date.now();
        track('export_completed', { export_type: 'json' }); status.textContent = ui('Backup download requested. Check your downloads to keep a separate copy.');
        try { localStorage.setItem(BACKUP_STATUS_KEY, JSON.stringify({ at, digest: await digest(raw) })); } catch { /* The download was requested; status metadata is optional. */ }
        void refresh();
      } catch (error) { status.textContent = uiError(error); }
    });
    // A generation token prevents a slow, earlier file read from replacing a newer preview.
    input.onchange = async () => {
      const file = input.files?.[0]; cancel(false); if (!file) return; const request = generation;
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('Use a backup smaller than 10 MB.');
        const raw = await file.text(), data = parseBackup(raw); if (generation !== request) return;
        pending = { raw, data }; status.textContent = '';
        find<HTMLElement>('[data-restore-summary]').textContent = ui('{products} products, {protocols} schedules, {calculations} calculations, {records} actual records.', { products: data.products?.length ?? 0, protocols: data.protocols.length, calculations: data.calculations?.length ?? 0, records: data.records?.length ?? 0 });
        const names = [...(data.products ?? []), ...data.protocols, ...(data.calculations ?? [])].map(entry => { const li = document.createElement('li'); li.textContent = entry.name; return li; });
        find<HTMLElement>('[data-restore-names]').replaceChildren(...names); find<HTMLElement>('[data-restore-details]').hidden = !names.length; preview.hidden = false;
      } catch (error) { if (generation === request) status.textContent = ui('Restore failed: {message}', { message: uiError(error) }); }
    };
    find<HTMLButtonElement>('[data-restore-cancel]').addEventListener('click', () => cancel());
    find<HTMLButtonElement>('[data-restore-confirm]').addEventListener('click', async () => {
      if (!pending || !confirm(ui('Replace all saved products, schedules, calculations and actual records with this backup? Download a backup first.'))) return;
      const restore = find<HTMLButtonElement>('[data-restore-confirm]'); restore.disabled = true;
      try {
        let hadRecords = false; try { hadRecords = readWorkspace().records.length > 0; } catch { /* An unreadable workspace can still be explicitly replaced. */ }
        const includesRecords = pending.data.version === 4 || hadRecords;
        await replaceWorkspace(pending.raw); cancel(); track('backup_restored');
        status.textContent = ui('Products, schedules and calculations restored.') + (includesRecords ? ' ' + ui('Actual records restored: {count}.', { count: readWorkspace().records.length }) : '');
        window.dispatchEvent(new Event('workspace-restored')); void refresh();
      } catch (error) { status.textContent = ui('Restore failed: {message}', { message: uiError(error) }); }
      finally { restore.disabled = false; }
    });
    window.addEventListener('workspace-changed', () => void refresh());
    window.addEventListener('storage', () => void refresh());
    void refresh();
  }
}
