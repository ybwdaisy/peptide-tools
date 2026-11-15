import { labelConcentration, positiveDecimal } from '../lib/calculator';

/** Both entry points share decimal arithmetic. Verification is never inferred. */
export function concentrationInput(prefix: string, amountId: string, concentrationId: string, locked = false) {
  const root = document.querySelector<HTMLElement>(`[data-concentration-source="${prefix}"]`)!;
  const mode = document.getElementById(`${prefix}-mode`) as HTMLSelectElement;
  const amount = document.getElementById(amountId) as HTMLInputElement;
  const volume = document.getElementById(`${prefix}-final-volume`) as HTMLInputElement;
  const concentration = document.getElementById(concentrationId) as HTMLInputElement;
  let previous = mode.value, manual = concentration.value;
  function draw() {
    const derived = mode.value === 'label';
    root.querySelectorAll<HTMLElement>('[data-vial-input], [data-volume-input]').forEach(box => { box.hidden = !derived; box.querySelectorAll<HTMLInputElement>('input').forEach(input => input.disabled = !derived); });
    concentration.readOnly = locked || derived;
    if (derived) { try { concentration.value = labelConcentration(amount.value, volume.value).toString(); } catch { concentration.value = ''; } }
  }
  function sync() { manual = concentration.value; previous = mode.value; draw(); }
  mode.addEventListener('input', () => {
    if (previous !== mode.value) { if (previous === 'known') manual = concentration.value; else concentration.value = manual; previous = mode.value; }
    draw();
  });
  amount.addEventListener('input', draw); volume.addEventListener('input', draw);
  mode.disabled = locked; root.hidden = locked; sync();
  return { mode, amount, volume, sync, value: () => mode.value === 'label' ? labelConcentration(amount.value, volume.value) : positiveDecimal(concentration.value, 'concentration') };
}
