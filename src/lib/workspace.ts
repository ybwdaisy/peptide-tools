import { parseBackup, serializeBackup, STORAGE_KEY, BACKUP_STATUS_KEY } from './backup';
import { validateProduct, type Product } from './products';
import type { Protocol } from './planner';
import { validateSavedCalculation, type SavedCalculation } from './saved-calculations';

export interface Workspace { version: 3; products: Product[]; protocols: Protocol[]; calculations: SavedCalculation[] }
/** Reading errors deliberately propagate: a failed read must never erase older records. */
export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { version: 3, products: [], protocols: [], calculations: [] };
  const data = parseBackup(raw);
  return { version: 3, products: data.products ?? [], protocols: data.protocols, calculations: data.calculations ?? [] };
}
function changed() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('workspace-changed')); }
function write(data: Workspace) { localStorage.setItem(STORAGE_KEY, serializeBackup(data.protocols, data.products, data.calculations)); changed(); }
export function saveProduct(raw: Product) {
  const product = validateProduct(raw), data = readWorkspace();
  if (!data.products.some(p => p.id === product.id) && data.products.length >= 50) throw new Error('This browser holds 50 products. Delete one before saving another.');
  data.products = [...data.products.filter(p => p.id !== product.id), product]; write(data);
}
export function deleteProduct(id: string) { const data = readWorkspace(); data.products = data.products.filter(p => p.id !== id); write(data); }
export function saveProtocols(protocols: Protocol[]) { const data = readWorkspace(); data.protocols = protocols; write(data); }
export function replaceWorkspace(raw: string) { const data = parseBackup(raw); write({ version: 3, products: data.products ?? [], protocols: data.protocols, calculations: data.calculations ?? [] }); }
export function exportWorkspace() { const data = readWorkspace(); return serializeBackup(data.protocols, data.products, data.calculations); }
export function clearProtocols() { const data = readWorkspace(); data.protocols = []; write(data); }
export function clearWorkspace() { localStorage.removeItem(STORAGE_KEY); try { localStorage.removeItem(BACKUP_STATUS_KEY); } catch { /* Record removal succeeded; optional metadata cannot block it. */ } changed(); }
export function saveCalculation(raw: SavedCalculation) {
  const setup = validateSavedCalculation(raw), data = readWorkspace();
  if (!data.calculations.some(c => c.id === setup.id) && data.calculations.length >= 50) throw new Error('This browser holds 50 calculations. Delete one before saving another.');
  data.calculations = [...data.calculations.filter(c => c.id !== setup.id), setup]; write(data);
}
export function deleteCalculation(id: string) { const data = readWorkspace(); data.calculations = data.calculations.filter(c => c.id !== id); write(data); }
