import test from 'node:test';
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import { validateProduct, canCalculateProduct, componentConcentration, matchingReference, type Product } from '../../src/lib/products';
import { parseBackup, serializeBackup, STORAGE_KEY } from '../../src/lib/backup';
import { readWorkspace, saveProduct, saveProtocols, replaceWorkspace, deleteProduct, exportWorkspace } from '../../src/lib/workspace';
import { validateProtocol, generateSchedule, type Protocol } from '../../src/lib/planner';
import { calculate } from '../../src/lib/calculator';
import { eventParams, safePage } from '../../src/lib/analytics-policy';

const product = (patch: Partial<Product> = {}): Product => ({ id: 'p1', revision: 'r1', name: 'BPC-157', brand: '', kind: 'single', form: 'powder', amountMg: '5', components: [], identityConfirmed: false, concentrationMgMl: '', concentrationVerified: false, ...patch });
const blend = (): Product => product({ kind: 'blend', name: 'CJC-1295 NO DAC + Ipamorelin', amountMg: '10', components: [{ name: 'CJC-1295 NO DAC', amountMg: '5' }, { name: 'Ipamorelin', amountMg: '5' }], identityConfirmed: true, concentrationMgMl: '5', concentrationVerified: true });
const protocol = (p = product()): Protocol => ({ id: 'schedule', name: 'Personal plan', timeZone: 'UTC', startDate: '2028-02-28', endDate: '2028-03-01', items: [{ id: 'item', label: p.name, dose: '250', unit: 'mcg', time: '08:00', frequency: { kind: 'daily' }, product: p }] });

test('a vial amount never becomes a concentration and incomplete records can be saved', () => {
  const p = validateProduct(product()); assert.equal(p.amountMg, '5'); assert.equal(p.concentrationMgMl, ''); assert.equal(canCalculateProduct(p), false);
  assert.equal(canCalculateProduct(validateProduct(product({ amountMg: '', identityConfirmed: true, form: 'solution', concentrationMgMl: '2', concentrationVerified: true }))), true);
  assert.throws(() => validateProduct(product({ concentrationVerified: true })), /concentration/);
  for (const amountMg of ['-1', 'NaN', 'Infinity', '1e9', '0', '<script>']) assert.throws(() => validateProduct(product({ amountMg })));
});

test('blend arithmetic requires verified identity, complete proportions and an explicit ingredient', () => {
  const p = validateProduct(blend()); assert.equal(canCalculateProduct(p), true); assert.equal(componentConcentration(p, '0'), '2.5');
  assert.equal(calculate({ concentration: new Decimal(componentConcentration(p, '1')), dose: '250', unit: 'mcg' }).volume, '0.1');
  assert.throws(() => componentConcentration(p, ''), /Choose/); assert.throws(() => componentConcentration(p, 'total'), /Choose/);
  assert.equal(canCalculateProduct(validateProduct({ ...p, components: [{ name: 'A', amountMg: '5' }, { name: 'B', amountMg: '' }] })), false);
  assert.equal(canCalculateProduct({ ...p, identityConfirmed: false }), false);
  assert.throws(() => validateProduct({ ...p, amountMg: '5' }), /match/);
  assert.throws(() => validateProduct({ ...p, components: [{ name: 'A', amountMg: '3' }, { name: 'B', amountMg: '3' }] }), /match/);
  const repeating = validateProduct({ ...p, amountMg: '3', concentrationMgMl: '1', components: [{ name: 'A', amountMg: '1' }, { name: 'B', amountMg: '2' }] });
  assert.equal(calculate({ concentration: new Decimal(componentConcentration(repeating, '0')), dose: '1', unit: 'mg' }).volume, '3');
});

test('precise names are matched only after label confirmation; no-DAC never maps to DAC', () => {
  for (const name of ['CJC-1295', 'CJC-1295 NO DAC', 'Mod GRF(1-29)', 'Unknown blend']) assert.equal(matchingReference(product({ name, identityConfirmed: true })), undefined);
  assert.equal(matchingReference(product({ name: 'CJC-1295 DAC', identityConfirmed: true })), 'cjc-1295');
  assert.equal(matchingReference(product()), undefined);
  assert.equal(matchingReference(product({ identityConfirmed: true })), 'bpc-157');
});

test('version 2 keeps immutable product snapshots while legacy backups remain readable', () => {
  const p = product(), schedule = protocol(p);
  const restored = parseBackup(serializeBackup([schedule], [p]));
  assert.equal(restored.version, 2); assert.deepEqual(restored.protocols[0]?.items[0]?.product, p);
  const later = { ...p, amountMg: '10', revision: 'r2' };
  const changed = parseBackup(serializeBackup([schedule], [later]));
  assert.equal(changed.products?.[0]?.amountMg, '10'); assert.equal(changed.protocols[0]?.items[0]?.product?.amountMg, '5');
  assert.equal(generateSchedule(validateProtocol(changed.protocols[0]!)).length, 3);
  const legacy = { ...schedule, items: schedule.items.map(({ product: _p, ...item }) => item) };
  assert.deepEqual(parseBackup(serializeBackup([legacy])).protocols[0], legacy);
  assert.throws(() => validateProtocol(protocol(blend())), /ingredient or total/);
  assert.throws(() => parseBackup(JSON.stringify({ version: 2, protocols: [], products: [p, p] })), /duplicate/);
});

test('workspace mutations preserve older plans, import atomically and protect unreadable data', () => {
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; }, removeItem: () => { stored = null; } } });
  stored = serializeBackup([protocol()]); saveProduct(product());
  assert.equal(readWorkspace().protocols.length, 1); assert.equal(readWorkspace().products.length, 1);
  saveProtocols([]); assert.equal(readWorkspace().products.length, 1);
  saveProtocols([protocol()]); deleteProduct('p1'); assert.equal(readWorkspace().protocols[0]?.items[0]?.product?.name, 'BPC-157');
  const original = exportWorkspace(); assert.throws(() => replaceWorkspace('{bad')); assert.equal(exportWorkspace(), original);
  stored = '{corrupt'; assert.throws(() => saveProduct(product())); assert.equal(stored, '{corrupt');
  replaceWorkspace(original); assert.equal(localStorage.getItem(STORAGE_KEY), original);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw new Error('unavailable'); } } });
  assert.throws(() => saveProduct(product()));
  Reflect.deleteProperty(globalThis, 'localStorage');
});

test('product analytics strips identities, paths, labels, concentrations and arbitrary errors', () => {
  assert.deepEqual(safePage('/zh/products/new'), { page_group: 'product_entry', page_location: 'https://peptides.ybwdaisy.com/products/new', page_title: 'Peptide Tools: product entry' });
  assert.deepEqual(eventParams('product_saved', { product_type: 'blend', name: 'BPC-157', id: 'p1', concentration: '2', error: 'private text' }), { product_type: 'blend' });
  assert.deepEqual(eventParams('product_entry_start', { product_type: 'single', name: 'Private' }), {});
});

 test('journey analytics accepts only contextual enums, never arbitrary actions or entry values', () => {
  assert.deepEqual(eventParams('navigation_action', { action: 'add_product', href: '/private', name: 'Private' }), { action: 'add_product' });
  assert.deepEqual(eventParams('navigation_action', { action: 'Private product', operation: 'create' }), {});
  assert.deepEqual(eventParams('product_saved', { operation: 'create', product_type: 'single', name: 'Private' }), { product_type: 'single', operation: 'create' });
  assert.deepEqual(eventParams('protocol_saved', { operation: 'update', tool_context: 'product', protocol: 'Private' }), { operation: 'update', tool_context: 'product' });
  assert.deepEqual(eventParams('product_entry_error', { error_code: 'storage_unavailable', operation: 'create', error: 'Private' }), { operation: 'create', error_code: 'storage_unavailable' });
  assert.deepEqual(eventParams('calculation_success', { operation: 'create', tool_context: 'private-label', traffic_class: 'qa', debug_mode: true }), {});
});
