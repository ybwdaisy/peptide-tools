import Decimal from 'decimal.js';

Decimal.set({ precision: 40 });
export type DoseUnit = 'mg' | 'mcg';
export type CalculationError = 'required' | 'invalid_number' | 'capacity_exceeded';
export class InputError extends Error {
  constructor(public code: CalculationError, message: string, public field: string) { super(message); }
}
export function positiveDecimal(value: string, field = 'value'): Decimal {
  if (!value.trim()) throw new InputError('required', 'Enter a value greater than zero.', field);
  if (!/^\d{1,9}(?:\.\d{1,8})?$/.test(value.trim()))
    throw new InputError('invalid_number', 'Use a positive decimal with up to 9 whole digits and 8 decimal places.', field);
  const parsed = new Decimal(value.trim());
  if (!parsed.isPositive() || parsed.isZero()) throw new InputError('invalid_number', 'Enter a value greater than zero.', field);
  return parsed;
}
export function calculate(input: { concentration: string; dose: string; unit: DoseUnit; syringe?: { capacity: '0.3' | '0.5' | '1'; increment: '0.5' | '1' | '2' } }) {
  const concentration = positiveDecimal(input.concentration, 'concentration');
  const dose = positiveDecimal(input.dose, 'dose');
  if (input.unit !== 'mg' && input.unit !== 'mcg') throw new InputError('invalid_number', 'Select mg or mcg.', 'unit');
  const doseMg = input.unit === 'mcg' ? dose.div(1000) : dose;
  const volume = doseMg.div(concentration);
  let markings: Decimal | undefined;
  let aligned = true;
  if (input.syringe) {
    if (!['0.3', '0.5', '1'].includes(input.syringe.capacity) || !['0.5', '1', '2'].includes(input.syringe.increment))
      throw new InputError('invalid_number', 'Select a supported U-100 syringe and graduation.', 'capacity');
    if (volume.gt(input.syringe.capacity)) throw new InputError('capacity_exceeded', 'This volume exceeds the selected syringe capacity. Check your inputs and device.', 'capacity');
    markings = volume.mul(100);
    aligned = markings.mod(input.syringe.increment).isZero();
  }
  const format = (n: Decimal) => n.toSignificantDigits(12).toFixed();
  return { volume: format(volume), doseMg: format(doseMg), markings: markings ? format(markings) : undefined, aligned };
}
