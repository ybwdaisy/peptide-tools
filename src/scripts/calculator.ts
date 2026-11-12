import { takeLanguageDraft } from '../lib/language-draft';
import { ui, uiError } from '../lib/i18n';
import { calculate, InputError, type DoseUnit } from '../lib/calculator';
import { track, trackStart } from './analytics';

export function initCalculator() {
  const form = document.querySelector<HTMLFormElement>('#calculator-form');
  if (!form) return;
  const error = document.querySelector<HTMLElement>('#calculator-error')!;
  const result = document.querySelector<HTMLElement>('#calculator-result')!;
  const syringeFields = document.querySelector<HTMLFieldSetElement>('#syringe-fields')!;
  const syringe = form.elements.namedItem('useSyringe') as HTMLInputElement;
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
  const draft = takeLanguageDraft();
  if (draft) for (const name of ['concentration', 'dose', 'unit', 'useSyringe', 'capacity', 'increment']) {
    const field = form.elements.namedItem(name) as HTMLInputElement;
    if (typeof draft.values[name] === 'string') { if (field.type === 'checkbox') field.checked = draft.values[name] === 'true'; else field.value = draft.values[name]; }
  }
  syringeFields.hidden = !syringe.checked; syringeFields.disabled = !syringe.checked;
  form.addEventListener('input', () => {
    trackStart('calculator_start');
    error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    result.hidden = true;
    document.querySelector<HTMLElement>('#result-empty')!.hidden = false;
    syringeFields.hidden = !syringe.checked;
    syringeFields.disabled = !syringe.checked;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    trackStart('calculator_start');
    error.textContent = '';
    try {
      const output = calculate({ concentration: value('concentration'), dose: value('dose'), unit: value('unit') as DoseUnit,
        ...(syringe.checked ? { syringe: { capacity: value('capacity') as '0.3' | '0.5' | '1', increment: value('increment') as '0.5' | '1' | '2' } } : {}) });
      document.querySelector('#result-volume')!.textContent = output.volume;
      document.querySelector('#result-equation')!.textContent = `${output.doseMg} mg ÷ ${value('concentration')} mg/mL`;
      const markings = document.querySelector<HTMLElement>('#result-markings')!;
      markings.hidden = !syringe.checked;
      document.querySelector('#markings-value')!.textContent = output.markings ?? '';
      const note = document.querySelector<HTMLElement>('#graduation-note')!;
      note.hidden = output.aligned;
      note.textContent = ui('This result falls between the selected graduations. Do not round it to a usable dose; verify with a qualified professional.');
      document.querySelector('#result-unit-note')!.textContent = syringe.checked ? ui('U-100 scale only: 100 markings = 1 mL. Markings are not peptide IU.') : ui('Calculated volume, not a dose recommendation.');
      result.hidden = false;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = true;
      track('calculation_success');
    } catch (caught) {
      const e = caught instanceof InputError ? caught : new InputError('invalid_number', 'Check the entered numbers and try again.', 'concentration');
      result.hidden = true;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = false;
      error.textContent = uiError(e);
      const field = form.elements.namedItem(e.field) as HTMLInputElement | null;
      field?.setAttribute('aria-invalid', 'true'); field?.focus();
      track('calculation_error', { error_code: e.code });
    }
  });
}
