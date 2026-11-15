import { takeLanguageDraft } from '../lib/language-draft';
import { ui, uiError } from '../lib/i18n';
import { calculate, InputError, type DoseUnit } from '../lib/calculator';
import { track, trackStart, trackThenNavigate } from './analytics';
import Decimal from 'decimal.js';
import { canCalculateProduct, componentConcentration, productSummary, type Product } from '../lib/products';
import { readWorkspace, saveCalculation, deleteCalculation } from '../lib/workspace';
import { validateSavedCalculation, type SavedCalculation } from '../lib/saved-calculations';
import { concentrationInput as initConcentrationInput } from './concentration-input';
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
  const hash = new URLSearchParams(location.hash.slice(1));
  const storageStatus = document.querySelector<HTMLElement>('#calculation-storage-status')!;
  const name = document.querySelector<HTMLInputElement>('#calculation-name')!;
  let saved: SavedCalculation | undefined;
  try { saved = readWorkspace().calculations.find(c => c.id === hash.get('calculation')); }
  catch { storageStatus.textContent = ui('Saved data could not be read. Calculations still work; nothing will be overwritten.'); }
  const productId = saved?.productId ?? hash.get('product');
  let calculationId = saved?.id ?? crypto.randomUUID(), calculated: SavedCalculation | undefined;
  const review = document.querySelector<HTMLInputElement>('#confirm-updated-product')!;
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
  if (hash.has('calculation') && !saved) { blocked = true; error.textContent = ui('This saved calculation is no longer available. Open the calculator to start again.'); }
  const source = initConcentrationInput('calculator-source', 'calculator-source-vial-amount', 'concentration', !!productId);
  if (saved) {
    for (const key of ['dose', 'unit', 'capacity', 'increment']) (form.elements.namedItem(key) as HTMLInputElement).value = saved[key as keyof SavedCalculation] as string;
    syringe.checked = saved.useSyringe; name.value = saved.name;
    if (!productId) { concentrationInput.value = saved.concentration; source.mode.value = saved.mode; source.amount.value = saved.vialAmount; source.volume.value = saved.finalVolume; }
    basis.value = product?.kind === 'blend' && product.revision !== saved.productRevision ? '' : saved.basis;
    if (product?.kind === 'blend' && !blocked && basis.value) concentrationInput.value = componentConcentration(product, basis.value);
    document.querySelector<HTMLElement>('#calculation-review')!.hidden = !product || product.revision === saved.productRevision;
  } else if (product) name.value = product.name;
  source.sync();
  (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = blocked;
  const draft = takeLanguageDraft();
  if (draft) for (const name of ['concentration', 'dose', 'unit', 'useSyringe', 'capacity', 'increment', 'concentrationMode', 'vialAmount', 'finalVolume']) {
    if (productId && ['concentration', 'concentrationMode', 'vialAmount', 'finalVolume'].includes(name)) continue;
    const field = form.elements.namedItem(name) as HTMLInputElement;
    if (typeof draft.values[name] === 'string') { if (field.type === 'checkbox') field.checked = draft.values[name] === 'true'; else field.value = draft.values[name]; }
  }
  if (draft?.values.calculationName) name.value = draft.values.calculationName;
  source.sync();
  syringeFields.hidden = !syringe.checked; syringeFields.disabled = !syringe.checked;
  if (product?.kind === 'blend' && draft?.values.basis) { basis.value = draft.values.basis; if (basis.value && !blocked) concentrationInput.value = componentConcentration(product, basis.value); }
  basis.addEventListener('change', () => {
    if (product && !blocked) concentrationInput.value = basis.value ? componentConcentration(product, basis.value) : '';
    form.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.addEventListener('input', () => {
    trackStart('calculator_start', { tool_context: product ? 'product' : 'standalone' });
    error.textContent = ''; calculated = undefined; storageStatus.textContent = '';
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
      if (product && readWorkspace().products.find(p => p.id === product.id)?.revision !== product.revision) throw new InputError('required', 'The product changed. Reopen this calculation to review the updated label.', 'dose');
      if (!document.querySelector<HTMLElement>('#calculation-review')!.hidden && !review.checked) throw new InputError('required', 'Check the updated product before calculating again.', 'confirmUpdatedProduct');
      if (blocked) throw new InputError('required', 'Verify the label, concentration and ingredient amounts before calculating.', 'concentration');
      if (product?.kind === 'blend' && !basis.value) { basis.focus(); throw new InputError('required', 'Choose the ingredient that your entered amount refers to.', 'concentration'); }
      // Recompute from the verified product. A DOM edit cannot silently change its basis.
      if (product) concentrationInput.value = componentConcentration(product, basis.value);
      const output = calculate({ concentration: product ? new Decimal(componentConcentration(product, basis.value)) : source.value(), dose: value('dose'), unit: value('unit') as DoseUnit,
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
      calculated = { id: calculationId, name: name.value, mode: product ? 'known' : source.mode.value as 'known' | 'label', concentration: concentrationInput.value, vialAmount: source.amount.value, finalVolume: source.volume.value, dose: value('dose'), unit: value('unit') as DoseUnit, useSyringe: syringe.checked, capacity: value('capacity') as '0.3' | '0.5' | '1', increment: value('increment') as '0.5' | '1' | '2', basis: basis.value, ...(product ? { productId: product.id, productRevision: product.revision } : {}) };
      result.hidden = false;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = true;
      track('calculation_success', { tool_context: product ? 'product' : 'standalone', input_mode: product ? 'known' : source.mode.value });
    } catch (caught) {
      const e = caught instanceof InputError ? caught : new InputError('invalid_number', 'Check the entered numbers and try again.', 'concentration');
      result.hidden = true;
      document.querySelector<HTMLElement>('#result-empty')!.hidden = false;
      error.textContent = uiError(e);
      calculated = undefined;
      const field = form.elements.namedItem(e.field) as HTMLInputElement | null;
      field?.setAttribute('aria-invalid', 'true'); field?.focus();
      track('calculation_error', { error_code: e.code, tool_context: product ? 'product' : 'standalone', input_mode: product ? 'known' : source.mode.value });
    }
  });
  function renderSaved() {
    const list = document.querySelector<HTMLElement>('#saved-calculation-list')!;
    list.replaceChildren();
    try {
      const entries = readWorkspace().calculations;
      document.querySelector<HTMLElement>('#saved-calculations')!.hidden = !entries.length;
      for (const setup of entries) {
        const row = document.createElement('li'), link = document.createElement('a'), remove = document.createElement('button');
        link.textContent = setup.name; link.href = `${localePath('/calculator', browserLocale())}#calculation=${encodeURIComponent(setup.id)}`;
        link.addEventListener('click', event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); trackThenNavigate('calculation_reused', { tool_context: setup.productId ? 'product' : 'standalone', input_mode: setup.mode }, link.href, link.href === location.href);
        });
        remove.type = 'button'; remove.className = 'text-button'; remove.textContent = ui('Delete'); remove.setAttribute('aria-label', ui('Delete saved calculation {name}', { name: setup.name }));
        remove.addEventListener('click', () => {
          if (!confirm(ui('Delete this saved calculation? Products and schedules will remain.'))) return;
          try { deleteCalculation(setup.id); if (calculationId === setup.id) calculationId = crypto.randomUUID(); renderSaved(); }
          catch (error) { storageStatus.textContent = uiError(error); }
        });
        row.append(link, remove); list.append(row);
      }
    } catch { storageStatus.textContent = ui('Saved data could not be read. Calculations still work; nothing will be overwritten.'); }
  }
  document.querySelector('#save-calculation-form')!.addEventListener('submit', event => {
    event.preventDefault();
    if (!calculated) return;
    try {
      if (product && readWorkspace().products.find(p => p.id === product.id)?.revision !== product.revision) throw new Error('The product changed. Reopen this calculation to review the updated label.');
      const setup = validateSavedCalculation({ ...calculated, id: calculationId, name: name.value });
      const operation = readWorkspace().calculations.some(c => c.id === setup.id) ? 'update' : 'create';
      saveCalculation(setup);
      history.replaceState(null, '', `${localePath('/calculator', browserLocale())}#calculation=${encodeURIComponent(setup.id)}`);
      document.querySelector<HTMLElement>('#calculation-review')!.hidden = true;
      storageStatus.textContent = ui('Calculation saved in this browser.');
      track('calculation_saved', { operation, tool_context: product ? 'product' : 'standalone', input_mode: setup.mode }); renderSaved();
    } catch (error) { storageStatus.textContent = uiError(error); }
  });
  name.addEventListener('input', () => { storageStatus.textContent = ''; });
  renderSaved();
}
