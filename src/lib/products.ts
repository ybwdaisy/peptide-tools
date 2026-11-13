import Decimal from 'decimal.js';
import { positiveDecimal } from './calculator';
import { formatMessage, type Locale } from './i18n';

export interface ProductComponent { name: string; amountMg: string }
export interface Product {
  id: string; name: string; brand: string; kind: 'single' | 'blend'; form: 'powder' | 'solution' | 'other';
  amountMg: string; components: ProductComponent[]; identityConfirmed: boolean;
  concentrationMgMl: string; concentrationVerified: boolean; revision: string;
}
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,80}$/.test(v);
function text(v: unknown, required = true): string {
  if (typeof v !== 'string' || v.length > 80 || /[\u0000-\u001f\u007f]/.test(v) || (required && !v.trim())) throw new Error('Use a name between 1 and 80 characters.');
  return v.trim();
}
function amount(v: unknown): string {
  if (v === '') return '';
  if (typeof v !== 'string') throw new Error('Enter a positive label amount or leave it unknown.');
  try { positiveDecimal(v); return v.trim(); } catch { throw new Error('Enter a positive label amount or leave it unknown.'); }
}
export function validateProduct(raw: unknown): Product {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The product record is invalid.');
  const p = raw as Record<string, unknown>;
  if (!identifier(p.id) || !identifier(p.revision)) throw new Error('The product identifier is invalid.');
  if (!['single', 'blend'].includes(String(p.kind)) || !['powder', 'solution', 'other'].includes(String(p.form))) throw new Error('Choose a product type and label form.');
  if (typeof p.identityConfirmed !== 'boolean' || typeof p.concentrationVerified !== 'boolean') throw new Error('Confirm the label fields explicitly.');
  const name = text(p.name), brand = text(p.brand ?? '', false), amountMg = amount(p.amountMg), concentrationMgMl = amount(p.concentrationMgMl);
  if (p.concentrationVerified && !concentrationMgMl) throw new Error('Enter a concentration before confirming it.');
  if (!Array.isArray(p.components) || p.components.length > 10) throw new Error('A blend supports 2 to 10 named ingredients.');
  const components: ProductComponent[] = p.kind === 'single' ? [] : p.components.map(c => {
    if (!c || typeof c !== 'object') throw new Error('Name every ingredient in the blend.');
    return { name: text((c as ProductComponent).name), amountMg: amount((c as ProductComponent).amountMg) };
  });
  if (p.kind === 'blend' && (components.length < 2 || new Set(components.map(c => c.name.toLowerCase())).size !== components.length)) throw new Error('Use 2 to 10 distinct ingredient names.');
  if (amountMg && components.length) {
    const known = components.reduce((sum, c) => c.amountMg ? sum.plus(c.amountMg) : sum, new Decimal(0));
    if (known.gt(amountMg) || (components.every(c => c.amountMg) && !known.eq(amountMg))) throw new Error('Ingredient amounts must match the total amount in one vial.');
  }
  return { id: p.id, revision: p.revision, name, brand, kind: p.kind as Product['kind'], form: p.form as Product['form'], amountMg, components, identityConfirmed: p.identityConfirmed, concentrationMgMl, concentrationVerified: p.concentrationVerified };
}
export function canCalculateProduct(p: Product): boolean {
  return p.identityConfirmed && p.concentrationVerified && !!p.concentrationMgMl && (p.kind === 'single' || (!!p.amountMg && p.components.length >= 2 && p.components.every(c => !!c.amountMg) && p.components.reduce((n, c) => n.plus(c.amountMg), new Decimal(0)).eq(p.amountMg)));
}
/** A blend concentration is total mixture mass per mL. The chosen component is explicit. */
export function componentConcentration(p: Product, basis: string): string {
  if (!canCalculateProduct(p)) throw new Error('Verify the label, concentration and ingredient amounts before calculating.');
  if (p.kind === 'single') return p.concentrationMgMl;
  const index = Number(basis);
  if (!/^\d+$/.test(basis) || !Number.isInteger(index) || !p.components[index]) throw new Error('Choose the ingredient that your entered amount refers to.');
  return new Decimal(p.concentrationMgMl).mul(p.components[index]!.amountMg).div(p.amountMg).toString();
}
export function productSummary(p: Product, locale: Locale = 'en'): string { return p.amountMg ? formatMessage(p.kind === 'blend' ? '{amount} mg total in one vial' : '{amount} mg in one vial', locale, { amount: p.amountMg }) : formatMessage('Amount not added', locale); }
export function matchingReference(p: Product): string | undefined {
  if (!p.identityConfirmed || p.kind !== 'single') return;
  const normalized = p.name.toLowerCase().replace(/[\s_-]+/g, '');
  const slugs: Record<string, string> = { bpc157: 'bpc-157', tb500: 'tb-500', ipamorelin: 'ipamorelin', ghkcu: 'ghk-cu', motsc: 'mots-c', epitalon: 'epitalon', epithalon: 'epitalon', semax: 'semax', selank: 'selank', aod9604: 'aod-9604', dsip: 'dsip', kpv: 'kpv', ll37: 'll-37', melanotanii: 'melanotan-ii', ghrp2: 'ghrp-2', ghrp6: 'ghrp-6', cjc1295dac: 'cjc-1295' };
  return slugs[normalized];
}
