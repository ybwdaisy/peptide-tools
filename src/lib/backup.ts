import { validateProtocol, type Protocol } from './planner';
export const STORAGE_KEY = 'peptide-tools.protocols.v1';
export interface Backup { version: 1; protocols: Protocol[] }
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('The backup must be smaller than 1 MB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!value || typeof value !== 'object' || (value as Backup).version !== 1 || !Array.isArray((value as Backup).protocols)) throw new Error('Use a version 1 Peptide Tools backup.');
  const list = (value as Backup).protocols;
  if (list.length > 20) throw new Error('A backup can contain at most 20 protocols.');
  const protocols = list.map(validateProtocol);
  if (new Set(protocols.map(p => p.id)).size !== protocols.length) throw new Error('The backup contains duplicate protocol identifiers.');
  return { version: 1, protocols };
}
export function serializeBackup(protocols: Protocol[]): string { return JSON.stringify(parseBackup(JSON.stringify({ version: 1, protocols })), null, 2); }
