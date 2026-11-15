import { validateProtocol, type Protocol } from './planner';
import { validateProduct, type Product } from './products';
import { validateSavedCalculation, type SavedCalculation } from './saved-calculations';
export const STORAGE_KEY = 'peptide-tools.protocols.v1';
export const BACKUP_STATUS_KEY = 'peptide-tools.backup-request.v1';
export interface Backup { version: 1 | 2 | 3; protocols: Protocol[]; products?: Product[]; calculations?: SavedCalculation[] }
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('The backup must be smaller than 1 MB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!value || typeof value !== 'object' || ![1, 2, 3].includes((value as Backup).version) || !Array.isArray((value as Backup).protocols)) throw new Error('Use a version 1, 2 or 3 Peptide Tools backup.');
  const list = (value as Backup).protocols;
  if (list.length > 20) throw new Error('A backup can contain at most 20 protocols.');
  const protocols = list.map(validateProtocol);
  if (new Set(protocols.map(p => p.id)).size !== protocols.length) throw new Error('The backup contains duplicate protocol identifiers.');
  if ((value as Backup).version === 1) return { version: 1, protocols };
  const productsRaw = (value as Backup).products;
  if (!Array.isArray(productsRaw) || productsRaw.length > 50) throw new Error('A backup can contain at most 50 products.');
  const products = productsRaw.map(validateProduct);
  if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('The backup contains duplicate product identifiers.');
  if ((value as Backup).version === 2) return { version: 2, protocols, products };
  const calculationsRaw = (value as Backup).calculations;
  if (!Array.isArray(calculationsRaw) || calculationsRaw.length > 50) throw new Error('A backup can contain at most 50 saved calculations.');
  const calculations = calculationsRaw.map(validateSavedCalculation);
  if (new Set(calculations.map(c => c.id)).size !== calculations.length) throw new Error('The backup contains duplicate calculation identifiers.');
  return { version: 3, protocols, products, calculations };
}
export function serializeBackup(protocols: Protocol[], products?: Product[], calculations: SavedCalculation[] = []): string {
  const extended = calculations.length > 0 || products?.some(p => p.solutionVolumeMl !== undefined) || protocols.some(p => p.items.some(i => i.product?.solutionVolumeMl !== undefined));
  const data = extended ? { version: 3, protocols, products: products ?? [], calculations } : products === undefined ? { version: 1, protocols } : { version: 2, protocols, products };
  return JSON.stringify(parseBackup(JSON.stringify(data)), null, 2);
}
