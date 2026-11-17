import { parseBackup, serializeBackup, STORAGE_KEY, BACKUP_STATUS_KEY } from './backup';
import { validateProduct, type Product } from './products';
import { validateProtocol, type Protocol } from './planner';
import { validateSavedCalculation, type SavedCalculation } from './saved-calculations';
import { scheduledKey, validateRecord, type ActualRecord } from './records';

export interface Workspace { version: 4; products: Product[]; protocols: Protocol[]; calculations: SavedCalculation[]; records: ActualRecord[] }
/** Reading errors deliberately propagate: a failed read must never erase older records. */
export function readWorkspace(): Workspace {
  try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { version: 4, products: [], protocols: [], calculations: [], records: [] };
  const data = parseBackup(raw);
  return { version: 4, products: data.products ?? [], protocols: data.protocols, calculations: data.calculations ?? [], records: data.records ?? [] };
  } catch { throw new Error('Saved data could not be read. Nothing has been overwritten. Restore a valid backup or clear local data before saving.'); }
}
function changed() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('workspace-changed')); }
/** Every UI mutation shares this origin-scoped lock; read/validate/write runs inside it. */
async function mutate(work: () => void): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) { await navigator.locks.request('peptide-tools.workspace-write.v1', async () => work()); return; }
  if (typeof window !== 'undefined') return Promise.reject(new Error('This browser cannot safely save local changes. Use a current browser over HTTPS. Existing data can still be exported.'));
  return Promise.resolve().then(work);
}
function serialized(data: Workspace) { return serializeBackup(data.protocols, data.products, data.calculations, data.records.length ? data.records : undefined); }
function write(data: Workspace) {
  const raw = serialized(data);
  try { localStorage.setItem(STORAGE_KEY, raw); }
  catch { throw new Error('Local storage is unavailable or full. Nothing was changed. Keep this form and download a backup.'); }
  changed();
}
export function saveProduct(raw: Product) {
  return mutate(() => {
  const product = validateProduct(raw), data = readWorkspace();
  if (!data.products.some(p => p.id === product.id) && data.products.length >= 50) throw new Error('This browser holds 50 products. Delete one before saving another.');
  data.products = [...data.products.filter(p => p.id !== product.id), product]; write(data);
  });
}
export function deleteProduct(id: string) { return mutate(() => { const data = readWorkspace(); data.products = data.products.filter(p => p.id !== id); write(data); }); }
export function saveProtocols(protocols: Protocol[]) { return mutate(() => { const data = readWorkspace(); data.protocols = protocols; write(data); }); }
export function saveProtocol(raw: Protocol) { return mutate(() => { const p = validateProtocol(raw), data = readWorkspace(); data.protocols = [...data.protocols.filter(v => v.id !== p.id), p]; write(data); }); }
export function deleteProtocol(id: string) { return mutate(() => { const data = readWorkspace(); data.protocols = data.protocols.filter(v => v.id !== id); write(data); }); }
export function replaceWorkspace(raw: string) { return mutate(() => { const data = parseBackup(raw); write({ version: 4, products: data.products ?? [], protocols: data.protocols, calculations: data.calculations ?? [], records: data.records ?? [] }); }); }
export function exportWorkspace() { return serialized(readWorkspace()); }
export function clearProtocols() { return mutate(() => { const data = readWorkspace(); data.protocols = []; write(data); }); }
export function clearWorkspace() { return mutate(() => { localStorage.removeItem(STORAGE_KEY); try { localStorage.removeItem(BACKUP_STATUS_KEY); } catch { /* Record removal succeeded; optional metadata cannot block it. */ } changed(); }); }
export function saveCalculation(raw: SavedCalculation) {
  return mutate(() => {
  const setup = validateSavedCalculation(raw), data = readWorkspace();
  if (!data.calculations.some(c => c.id === setup.id) && data.calculations.length >= 50) throw new Error('This browser holds 50 calculations. Delete one before saving another.');
  data.calculations = [...data.calculations.filter(c => c.id !== setup.id), setup]; write(data);
  });
}
export function deleteCalculation(id: string) { return mutate(() => { const data = readWorkspace(); data.calculations = data.calculations.filter(c => c.id !== id); write(data); }); }
/** Re-read at mutation time; never write a stale view of the rest of the workspace. */
export function saveRecord(raw: ActualRecord, expected?: string) {
  return mutate(() => {
  const record = validateRecord(raw), data = readWorkspace(), existing = data.records.find(r => r.id === record.id);
  if (existing ? expected !== existing.updatedAt : expected !== undefined) throw new Error('This record changed in another tab. Reopen it before saving.');
  if (record.scheduled && data.records.some(r => r.id !== record.id && r.scheduled && scheduledKey(r.scheduled) === scheduledKey(record.scheduled!))) throw new Error('This scheduled entry already has a record. Edit the existing record instead.');
  if (existing && (existing.createdAt !== record.createdAt || JSON.stringify(existing.scheduled) !== JSON.stringify(record.scheduled))) throw new Error('The original scheduled record cannot be changed.');
  data.records = [...data.records.filter(r => r.id !== record.id), record]; write(data);
  });
}
export function deleteRecord(id: string, expected: string) {
  return mutate(() => {
  const data = readWorkspace(), record = data.records.find(r => r.id === id);
  if (!record || record.updatedAt !== expected) throw new Error('This record changed in another tab. Reopen it before saving.');
  data.records = data.records.filter(r => r.id !== id); write(data);
  });
}
