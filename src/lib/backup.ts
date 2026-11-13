import { validateProtocol, type Protocol } from './planner';
import { validateProduct, type Product } from './products';
export const STORAGE_KEY = 'peptide-tools.protocols.v1';
export interface Backup { version: 1 | 2; protocols: Protocol[]; products?: Product[] }
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('The backup must be smaller than 1 MB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!value || typeof value !== 'object' || ![1, 2].includes((value as Backup).version) || !Array.isArray((value as Backup).protocols)) throw new Error('Use a version 1 or 2 Peptide Tools backup.');
  const list = (value as Backup).protocols;
  if (list.length > 20) throw new Error('A backup can contain at most 20 protocols.');
  const protocols = list.map(validateProtocol);
  if (new Set(protocols.map(p => p.id)).size !== protocols.length) throw new Error('The backup contains duplicate protocol identifiers.');
  if ((value as Backup).version === 1) return { version: 1, protocols };
  const productsRaw = (value as Backup).products;
  if (!Array.isArray(productsRaw) || productsRaw.length > 50) throw new Error('A backup can contain at most 50 products.');
  const products = productsRaw.map(validateProduct);
  if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('The backup contains duplicate product identifiers.');
  return { version: 2, protocols, products };
}
export function serializeBackup(protocols: Protocol[], products?: Product[]): string { return JSON.stringify(parseBackup(JSON.stringify(products === undefined ? { version: 1, protocols } : { version: 2, protocols, products })), null, 2); }
