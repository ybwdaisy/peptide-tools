import { takeLanguageDraft } from '../lib/language-draft';
import { ui, uiError } from '../lib/i18n';
import { calculate, InputError, type DoseUnit } from '../lib/calculator';
import { track, trackStart } from './analytics';
import Decimal from 'decimal.js';
import { canCalculateProduct, componentConcentration, productSummary, type Product } from '../lib/products';
import { readWorkspace } from '../lib/workspace';
import { browserLocale, localePath } from '../lib/i18n';

export function initCalculator() {
  const form = document.querySelector<HTMLFormElement>('#calculator-form');
  if (!form) return;
  window.addEventListener('hashchange', () => location.reload());
  const error = document.querySelector<HTMLElement>('#calculator-error')!;
  const result = document.querySelector<HTMLElement>('#calculator-result')!;
  const syringeFields = document.querySelector<HTMLFieldSetElement>('#syringe-fields')!;
  const syringe = form.elements.namedItem('useSyringe') as HTMLInputElement;
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
  const productId = new URLSearchParams(location.hash.slice(1)).get('product');
  const basis = document.querySelector<HTMLSelectElement>('#calculation-basis')!;
  const concentrationInput = form.elements.namedItem('concentration') as HTMLInputElement;
  let product: Product | undefined, blocked = false;
  if (productId) {
    document.querySelector<HTMLElement>('#calculator-product')!.hidden = false;
    try {
      product = readWorkspace().products.find(p => p.id === productId);
      if (!product) throw new Error('This product is not available in this browser. Open My products to choose another.');
      document.querySelector('#calculation-product-name')!.textContent = product.name;
      document.querySelector('#calculation-product-spec')!.textContent = productSummary(product, browserLocale());
      const edit = document.querySelector<HTMLAnchorElement>('#calculation-product-edit')!;
      edit.dataset.analyticsAction = 'edit_product';
      edit.href = `${localePath('/products/new', browserLocale())}#edit=${product.id}`;
      blocked = !canCalculateProduct(product);
      document.querySelector('#calculation-product-note')!.textContent = blocked ? ui('Verify the label, concentration and ingredient amounts before calculating.') : product.kind === 'blend' ? ui('The saved concentration is for the total mixture. Choose an ingredient to calculate its share.') : ui('Using the concentration you verified for this product.');
      concentrationInput.readOnly = true;
      if (product.kind === 'blend') {
        document.querySelector<HTMLElement>('#calculation-basis-wrap')!.hidden = false;
        for (const [n, component] of product.components.entries()) { const option = document.createElement('option'); option.value = String(n); option.textContent = component.name; basis.append(option); }
      } else concentrationInput.value = product.concentrationMgMl;
    } catch (caught) {
      blocked = true; document.querySelector('#calculation-product-name')!.textContent = ui('Product unavailable');
      document.querySelector('#calculation-product-note')!.textContent = uiError(caught);
    }
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = blocked;
  }
  const draft = takeLanguageDraft();
  if (draft) for (const name of ['concentration', 'dose', 'unit', 'useSyringe', 'capacity', 'increment']) {
    if (productId && name === 'concentration') continue;
    const field = form.elements.namedItem(name) as HTMLInputElement;
    if (typeof draft.values[name] === 'string') { if (field.type === 'checkbox') field.checked = draft.values[name] === 'true'; else field.value = draft.values[name]; }
  }
  syringeFields.hidden = !syringe.checked; syringeFields.disabled = !syringe.checked;
  if (product?.kind === 'blend' && draft?.values.basis) { basis.value = draft.values.basis; if (basis.value && !blocked) concentrationInput.value = componentConcentration(product, basis.value); }
  basis.addEventListener('change', () => {
    if (product && !blocked) concentrationInput.value = basis.value ? componentConcentration(product, basis.value) : '';
    form.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.addEventListener('input', () => {
    trackStart('calculator_start', { tool_context: product ? 'product' : 'standalone' });
    error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    result.hidden = true;
    document.querySelector<HTMLElement>('#result-empty')!.hidden = false;
    document.querySelector<HTMLElement>('#calculation-plan-link')!.hidden = true;
    syringeFields.hidden = !syringe.checked;
    syringeFields.disabled = !syringe.checked;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    trackStart('calculator_start', { tool_context: product ? 'product' : 'standalone' });
    error.textContent = '';
    try {
      if (blocked) throw new InputError('required', 'Verify the label, concentration and ingredient amounts before calculating.', 'concentration');
      if (product?.kind === 'blend' && !basis.value) { basis.focus(); throw new InputError('required', 'Choose the ingredient that your entered amount refers to.', 'concentration'); }
      // Recompute from the verified product. A DOM edit cannot silently change its basis.
      if (product) concentrationInput.value = componentConcentration(product, basis.value);
      const output = calculate({ concentration: product ? new Decimal(componentConcentration(product, basis.value)) : value('concentration'), dose: value('dose'), unit: value('unit') as DoseUnit,
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
      const blend = document.querySelector<HTMLElement>('#blend-result')!; blend.hidden = product?.kind !== 'blend';
      if (product?.kind === 'blend') {
        const actualVolume = new Decimal(value('dose')).div(value('unit') === 'mcg' ? 1000 : 1).div(concentrationInput.value);
        const list = document.querySelector('#blend-amounts')!; list.replaceChildren();
        for (const component of product.components) { const line = document.createElement('li'); line.textContent = `${component.name}: ${actualVolume.mul(product.concentrationMgMl).mul(component.amountMg).div(product.amountMg).toSignificantDigits(12).toFixed()} mg`; list.append(line); }
      }
      const plan = document.querySelector<HTMLAnchorElement>('#calculation-plan-link')!;
      plan.hidden = !product;
      if (product) {
        plan.dataset.analyticsAction = 'use_calculation';
        plan.href = `${localePath('/planner', browserLocale())}#product=${product.id}`;
        plan.onclick = () => {
          try { sessionStorage.setItem('peptide-tools.calculation-draft.v1', JSON.stringify({ productId: product!.id, revision: product!.revision, dose: value('dose'), unit: value('unit'), basis: basis.value, expires: Date.now() + 300_000 })); } catch { /* Plan remains usable; amounts can be entered again. */ }
        };
      }
      result.hidden = false;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = true;
      track('calculation_success', { tool_context: product ? 'product' : 'standalone' });
    } catch (caught) {
      const e = caught instanceof InputError ? caught : new InputError('invalid_number', 'Check the entered numbers and try again.', 'concentration');
      result.hidden = true;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = false;
      error.textContent = uiError(e);
      const field = form.elements.namedItem(e.field) as HTMLInputElement | null;
      field?.setAttribute('aria-invalid', 'true'); field?.focus();
      track('calculation_error', { error_code: e.code, tool_context: product ? 'product' : 'standalone' });
    }
  });
}
