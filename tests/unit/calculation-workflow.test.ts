import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, labelConcentration } from '../../src/lib/calculator';
import { validateSavedCalculation, type SavedCalculation } from '../../src/lib/saved-calculations';
import { validateProduct, canCalculateProduct } from '../../src/lib/products';
import { serializeBackup, parseBackup } from '../../src/lib/backup';
import { saveCalculation, readWorkspace, saveProtocols, saveProduct, deleteProduct, replaceWorkspace, exportWorkspace } from '../../src/lib/workspace';
import { eventParams } from '../../src/lib/analytics-policy';
const setup = (patch: Partial<SavedCalculation> = {}): SavedCalculation => ({ id: 'c1', name: 'My own calculation', mode: 'label', concentration: '2', vialAmount: '5', finalVolume: '2.5', dose: '250', unit: 'mcg', useSyringe: false, capacity: '1', increment: '1', basis: '', ...patch });
const product = { id: 'p1', revision: 'r1', name: 'My label', brand: '', kind: 'single', form: 'powder', amountMg: '5', components: [], identityConfirmed: true, concentrationMgMl: '', concentrationVerified: false };

test('label arithmetic retains repeating precision and tiny nonzero concentrations without choosing an amount', () => {
  assert.equal(calculate({ concentration: labelConcentration('1', '3'), dose: '1', unit: 'mg' }).volume, '3');
  assert.equal(labelConcentration('0.00000001', '999999999').isPositive(), true);
  for (const input of ['', '0', '-1', 'NaN', '1e2']) assert.throws(() => labelConcentration(input, '2'));
  assert.throws(() => labelConcentration('5', '0'));
});
test('label-derived product concentration is recomputed, incomplete labels remain unverified', () => {
  const p = validateProduct({ ...product, solutionVolumeMl: '3', concentrationMgMl: '999' });
  assert.equal(p.concentrationMgMl, labelConcentration('5', '3').toString()); assert.equal(canCalculateProduct(p), false);
  assert.equal(canCalculateProduct(validateProduct({ ...p, concentrationVerified: true })), true);
  assert.equal(validateProduct({ ...product, solutionVolumeMl: '' }).concentrationMgMl, '');
  assert.throws(() => validateProduct({ ...product, solutionVolumeMl: '', concentrationVerified: true }));
});
test('saved calculation validation rejects invalid dimensions, overflow and incomplete product references', () => {
  assert.equal(validateSavedCalculation(setup()).concentration, '2');
  assert.throws(() => validateSavedCalculation(setup({ finalVolume: '0' })));
  assert.throws(() => validateSavedCalculation(setup({ dose: '9999', useSyringe: true, capacity: '0.3' })));
  assert.throws(() => validateSavedCalculation(setup({ productId: 'p1', mode: 'known' })));
  assert.throws(() => validateSavedCalculation(setup({ name: '' })));
  assert.equal(validateSavedCalculation({ ...setup(), hiddenPrivateField: 'discard' } as SavedCalculation).name, 'My own calculation');
});
test('v3 roundtrip includes setups, rejects duplicates/future versions and still reads v1/v2', () => {
  const raw = serializeBackup([], [], [setup()]); const restored = parseBackup(raw);
  assert.equal(restored.version, 3); assert.deepEqual(restored.calculations, [setup()]);
  assert.equal(parseBackup(serializeBackup([])).version, 1);
  assert.equal(parseBackup(serializeBackup([], [validateProduct(product)])).version, 2);
  assert.equal(parseBackup(serializeBackup([], [validateProduct({ ...product, solutionVolumeMl: '2' })])).version, 3);
  assert.throws(() => parseBackup(JSON.stringify({ version: 3, products: [], protocols: [], calculations: [setup(), setup()] })), /duplicate/);
  assert.throws(() => parseBackup(JSON.stringify({ version: 4, products: [], protocols: [], calculations: [] })));
});
test('all workspace mutations preserve calculations and failed imports/writes leave the envelope intact', () => {
  let stored: string | null = null, fail = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { if (fail) throw Error('full'); stored = value; }, removeItem: () => { stored = null; } } });
  try {
    stored = serializeBackup([]); saveCalculation(setup()); saveProduct(validateProduct(product)); saveProtocols([]); deleteProduct('p1');
    assert.equal(readWorkspace().calculations.length, 1);
    const before = exportWorkspace(); assert.throws(() => replaceWorkspace('{bad')); assert.equal(exportWorkspace(), before);
    fail = true; assert.throws(() => saveCalculation(setup({ dose: '500' }))); assert.equal(exportWorkspace(), before);
    fail = false; saveCalculation(setup({ dose: '500' })); assert.equal(readWorkspace().calculations.length, 1); assert.equal(readWorkspace().calculations[0]?.dose, '500');
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
test('save/reuse analytics allows only fixed modes and contexts, never the stored inputs or identity', () => {
  assert.deepEqual(eventParams('calculation_error', { input_mode: 'label', error_code: 'required', finalVolume: 'PRIVATE' }), { error_code: 'required', input_mode: 'label' });
  for (const event of ['calculation_saved', 'calculation_reused'] as const) {
    assert.deepEqual(eventParams(event, { ...setup(), input_mode: 'label', tool_context: 'standalone', operation: 'create', productId: 'SECRET' }), { ...(event === 'calculation_saved' ? { operation: 'create' } : {}), tool_context: 'standalone', input_mode: 'label' });
    assert.deepEqual(eventParams(event, { input_mode: 'SECRET', name: 'SECRET', dose: '250', finalVolume: '2.5' }), {});
  }
});
