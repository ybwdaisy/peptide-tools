import { validateProtocol, type Protocol } from './planner';
import { validateProduct, type Product } from './products';
import { validateSavedCalculation, type SavedCalculation } from './saved-calculations';
import { MAX_RECORDS, scheduledKey, validateRecord, type ActualRecord } from './records';
export const STORAGE_KEY = 'peptide-tools.protocols.v1';
export const BACKUP_STATUS_KEY = 'peptide-tools.backup-request.v1';
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export interface Backup { version: 1 | 2 | 3 | 4; protocols: Protocol[]; products?: Product[]; calculations?: SavedCalculation[]; records?: ActualRecord[] }
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error('Use a backup smaller than 10 MB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!value || typeof value !== 'object' || ![1, 2, 3, 4].includes((value as Backup).version) || !Array.isArray((value as Backup).protocols)) throw new Error('Use a version 1, 2, 3 or 4 Peptide Tools backup.');
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
  if ((value as Backup).version === 3) return { version: 3, protocols, products, calculations };
  const recordsRaw = (value as Backup).records;
  if (!Array.isArray(recordsRaw) || recordsRaw.length > MAX_RECORDS) throw new Error('A backup can contain at most 10,000 actual records.');
  const records = recordsRaw.map(validateRecord);
  const keys = records.flatMap(r => r.scheduled ? [scheduledKey(r.scheduled)] : []);
  if (new Set(records.map(r => r.id)).size !== records.length || new Set(keys).size !== keys.length) throw new Error('The backup contains duplicate actual records.');
  return { version: 4, protocols, products, calculations, records };
}
export function serializeBackup(protocols: Protocol[], products?: Product[], calculations: SavedCalculation[] = [], records?: ActualRecord[]): string {
  const extended = calculations.length > 0 || products?.some(p => p.solutionVolumeMl !== undefined) || protocols.some(p => p.items.some(i => i.product?.solutionVolumeMl !== undefined));
  const data = records !== undefined ? { version: 4, protocols, products: products ?? [], calculations, records } : extended ? { version: 3, protocols, products: products ?? [], calculations } : products === undefined ? { version: 1, protocols } : { version: 2, protocols, products };
  return JSON.stringify(parseBackup(JSON.stringify(data)), null, 2);
}
