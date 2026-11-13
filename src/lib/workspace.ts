import { parseBackup, serializeBackup, STORAGE_KEY } from './backup';
import { validateProduct, type Product } from './products';
import type { Protocol } from './planner';

export interface Workspace { version: 2; products: Product[]; protocols: Protocol[] }
/** Reading errors deliberately propagate: a failed read must never erase older records. */
export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { version: 2, products: [], protocols: [] };
  const data = parseBackup(raw);
  return { version: 2, products: data.products ?? [], protocols: data.protocols };
}
function write(data: Workspace) { localStorage.setItem(STORAGE_KEY, serializeBackup(data.protocols, data.products)); }
export function saveProduct(raw: Product) {
  const product = validateProduct(raw), data = readWorkspace();
  if (!data.products.some(p => p.id === product.id) && data.products.length >= 50) throw new Error('This browser holds 50 products. Delete one before saving another.');
  data.products = [...data.products.filter(p => p.id !== product.id), product]; write(data);
}
export function deleteProduct(id: string) { const data = readWorkspace(); data.products = data.products.filter(p => p.id !== id); write(data); }
export function saveProtocols(protocols: Protocol[]) { const data = readWorkspace(); data.protocols = protocols; write(data); }
export function replaceWorkspace(raw: string) { const data = parseBackup(raw); write({ version: 2, products: data.products ?? [], protocols: data.protocols }); }
export function exportWorkspace() { const data = readWorkspace(); return serializeBackup(data.protocols, data.products); }
export function clearProtocols() { const data = readWorkspace(); data.protocols = []; write(data); }
export function clearWorkspace() { localStorage.removeItem(STORAGE_KEY); }
