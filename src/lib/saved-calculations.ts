import Decimal from 'decimal.js';
import { calculate, labelConcentration, positiveDecimal, type DoseUnit } from './calculator';

export interface SavedCalculation {
  id: string; name: string; mode: 'known' | 'label'; concentration: string;
  vialAmount: string; finalVolume: string; dose: string; unit: DoseUnit;
  useSyringe: boolean; capacity: '0.3' | '0.5' | '1'; increment: '0.5' | '1' | '2';
  basis: string; productId?: string; productRevision?: string;
}
export function validateSavedCalculation(raw: unknown): SavedCalculation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('This saved calculation is invalid.');
  const p = raw as SavedCalculation;
  const id = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,80}$/.test(v);
  if (!id(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || /[\u0000-\u001f]/.test(p.name)) throw new Error('Name this calculation using 1 to 80 characters.');
  if (!['known', 'label'].includes(p.mode) || !['mg', 'mcg'].includes(p.unit) || typeof p.useSyringe !== 'boolean' || !['0.3', '0.5', '1'].includes(p.capacity) || !['0.5', '1', '2'].includes(p.increment)) throw new Error('This saved calculation is invalid.');
  const linked = p.productId !== undefined || p.productRevision !== undefined;
  if (linked && (!id(p.productId) || !id(p.productRevision) || p.mode !== 'known')) throw new Error('This saved calculation is invalid.');
  if (typeof p.basis !== 'string' || !/^(?:[0-9])?$/.test(p.basis)) throw new Error('This saved calculation is invalid.');
  for (const value of [p.concentration, p.vialAmount, p.finalVolume, p.dose]) if (typeof value !== 'string' || value.length > 100) throw new Error('This saved calculation is invalid.');
  const concentration = p.mode === 'label' ? labelConcentration(p.vialAmount, p.finalVolume) : linked ? new Decimal(p.concentration) : positiveDecimal(p.concentration, 'concentration');
  calculate({ concentration, dose: p.dose, unit: p.unit, ...(p.useSyringe ? { syringe: { capacity: p.capacity, increment: p.increment } } : {}) });
  return { id: p.id, name: p.name.trim(), mode: p.mode, concentration: concentration.toString(), vialAmount: p.mode === 'label' ? p.vialAmount.trim() : '', finalVolume: p.mode === 'label' ? p.finalVolume.trim() : '', dose: p.dose.trim(), unit: p.unit, useSyringe: p.useSyringe, capacity: p.capacity, increment: p.increment, basis: p.basis, ...(linked ? { productId: p.productId, productRevision: p.productRevision } : {}) };
}
