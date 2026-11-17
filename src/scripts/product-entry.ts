import { concentrationInput } from './concentration-input';
import { browserLocale, localePath, ui, uiError } from '../lib/i18n';
import { validateProduct, type Product, type ProductComponent } from '../lib/products';
import { readWorkspace, saveProduct } from '../lib/workspace';
import { takeLanguageDraft } from '../lib/language-draft';
import { track, trackStart, trackThenNavigate } from './analytics';

export function initProductEntry() {
  const form = document.querySelector<HTMLFormElement>('#product-form');
  if (!form) return;
  window.addEventListener('hashchange', () => location.reload());
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const error = el('product-entry-error'), status = el('product-entry-status'), components = el('product-components');
  const initialId = new URLSearchParams(location.hash.slice(1)).get('edit');
  let editing: Product | undefined;
  let blocked = false, labelViewed = false, leaving = false;
  form.dataset.editingId = crypto.randomUUID();

  function showStep(step: 'name' | 'label', focus = false) {
    form!.dataset.step = step;
    el('product-name-step').hidden = step !== 'name'; el('product-label-step').hidden = step !== 'label';
    el('product-entry-name').textContent = field('productName').value.trim();
    if (focus) (step === 'label' ? el('product-label-heading') : field('productName')).focus();
  }
  function renumber() {
    const rows = components.querySelectorAll<HTMLElement>('[data-component]');
    rows.forEach((row, n) => {
      const key = row.dataset.componentId!;
      row.querySelector<HTMLLabelElement>('[data-component-name-label]')!.htmlFor = `ingredient-${key}-name`;
      row.querySelector<HTMLInputElement>('[data-component-name]')!.id = `ingredient-${key}-name`;
      row.querySelector<HTMLLabelElement>('[data-component-amount-label]')!.htmlFor = `ingredient-${key}-amount`;
      row.querySelector<HTMLInputElement>('[data-component-amount]')!.id = `ingredient-${key}-amount`;
      row.querySelector('[data-component-name-label]')!.textContent = ui('Ingredient {number} name', { number: n + 1 });
      row.querySelector<HTMLButtonElement>('[data-remove-component]')!.disabled = rows.length <= 2;
    });
    el<HTMLButtonElement>('product-add-component').disabled = rows.length >= 10;
  }
  function addComponent(data?: ProductComponent) {
    if (components.children.length >= 10) return;
    const fragment = el<HTMLTemplateElement>('product-component-template').content.cloneNode(true) as DocumentFragment;
    const row = fragment.querySelector<HTMLElement>('[data-component]')!;
    row.dataset.componentId = crypto.randomUUID();
    row.querySelector<HTMLInputElement>('[data-component-name]')!.value = data?.name ?? '';
    row.querySelector<HTMLInputElement>('[data-component-amount]')!.value = data?.amountMg ?? '';
    row.querySelector('[data-remove-component]')!.addEventListener('click', () => {
      if (components.children.length <= 2) return;
      row.remove(); field('concentrationVerified').checked = false; renumber(); trackStart('product_entry_start', { operation: editing ? 'update' : 'create' });
    });
    components.append(fragment); renumber();
  }
  function showType() {
    const blend = field('kind').value === 'blend';
    el('product-components-section').hidden = !blend;
    components.querySelectorAll<HTMLInputElement>('[data-component-name], [data-component-amount]').forEach(input => input.disabled = !blend);
  }
  function continueToLabel() {
    trackStart('product_entry_start', { operation: editing ? 'update' : 'create' });
    error.textContent = '';
    if (!field('productName').value.trim()) {
      track('product_entry_error', { operation: editing ? 'update' : 'create', error_code: 'invalid_label' });
      error.textContent = ui('Use a name between 1 and 80 characters.'); field('productName').setAttribute('aria-invalid', 'true'); field('productName').focus(); return;
    }
    showType(); showStep('label', true);
    if (!labelViewed) { labelViewed = true; track('product_label_view', { operation: editing ? 'update' : 'create' }); }
  }
  try {
    const workspace = readWorkspace();
    if (initialId) {
      editing = workspace.products.find(p => p.id === initialId);
      if (!editing) { blocked = true; error.textContent = ui('This product is no longer saved in this browser. Return to your products to start again.'); }
    }
  } catch {
    blocked = true; error.textContent = ui('Saved data could not be read. Nothing has been overwritten. Restore a valid backup or clear local data from My products before saving.');
  }
  if (editing) {
    form.dataset.editingId = editing.id; form.dataset.revision = editing.revision;
    field('productName').value = editing.name; field('brand').value = editing.brand; field('kind').value = editing.kind; field('form').value = editing.form;
    field('amountMg').value = editing.amountMg; field('identityConfirmed').checked = editing.identityConfirmed;
    field('concentrationMgMl').value = editing.concentrationMgMl; field('concentrationVerified').checked = editing.concentrationVerified;
    editing.components.forEach(addComponent);
    field('concentrationMode').value = editing.solutionVolumeMl === undefined ? 'known' : 'label';
    field('solutionVolumeMl').value = editing.solutionVolumeMl ?? '';
    status.textContent = ui('Editing a saved label. Existing schedules keep their saved product details.');
  }
  while (components.children.length < 2) addComponent();
  const draft = takeLanguageDraft();
  if (draft) {
    const values = draft.values;
    for (const name of ['productName', 'brand', 'kind', 'form', 'amountMg', 'concentrationMgMl', 'concentrationMode', 'solutionVolumeMl', 'identityConfirmed', 'concentrationVerified']) {
      if (typeof values[name] !== 'string') continue;
      const input = field(name);
      if (input.type === 'checkbox') input.checked = values[name] === 'true'; else input.value = values[name];
    }
    if (draft.items.length) {
      components.replaceChildren(); draft.items.forEach(item => addComponent({ name: item.name ?? '', amountMg: item.amountMg ?? '' }));
      while (components.children.length < 2) addComponent();
    }
    if (draft.editingId && /^[\w-]{1,80}$/.test(draft.editingId)) form.dataset.editingId = draft.editingId;
  }
  concentrationInput('product-source', 'product-amount', 'product-concentration');
  showType(); showStep(draft?.step === 'label' || (!draft && editing) ? 'label' : 'name');
  el('product-continue').addEventListener('click', continueToLabel);
  el('product-back').addEventListener('click', () => showStep('name', true));
  el('product-add-component').addEventListener('click', () => { addComponent(); showType(); field('concentrationVerified').checked = false; trackStart('product_entry_start', { operation: editing ? 'update' : 'create' }); components.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus(); });
  field('kind').addEventListener('change', showType);
  form.addEventListener('input', event => {
    trackStart('product_entry_start', { operation: editing ? 'update' : 'create' });
    if (!blocked) error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    const input = event.target as HTMLInputElement;
    if (['productName', 'kind'].includes(input.name)) field('identityConfirmed').checked = false;
    if (['productName', 'kind', 'form', 'amountMg', 'concentrationMgMl', 'concentrationMode', 'solutionVolumeMl'].includes(input.name) || input.hasAttribute('data-component-name') || input.hasAttribute('data-component-amount')) field('concentrationVerified').checked = false;
  });
  let nativeErrorReported = false;
  form.addEventListener('invalid', () => {
    if (nativeErrorReported) return;
    nativeErrorReported = true;
    queueMicrotask(() => { nativeErrorReported = false; });
    trackStart('product_entry_start', { operation: editing ? 'update' : 'create' });
    track('product_entry_error', { operation: editing ? 'update' : 'create', error_code: 'invalid_label' });
  }, true);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (leaving) return;
    trackStart('product_entry_start', { operation: editing ? 'update' : 'create' });
    if (form.dataset.step === 'name') { continueToLabel(); return; }
    if (blocked) { track('product_entry_error', { operation: editing ? 'update' : 'create', error_code: 'unreadable_data' }); return; }
    error.textContent = '';
    const raw = {
      id: form.dataset.editingId!, revision: crypto.randomUUID(), name: field('productName').value.trim(), brand: field('brand').value.trim(), kind: field('kind').value,
      form: field('form').value, amountMg: field('amountMg').value.trim(), identityConfirmed: field('identityConfirmed').checked,
      ...(field('concentrationMode').value === 'label' ? { solutionVolumeMl: field('solutionVolumeMl').value.trim() } : {}),
      concentrationMgMl: field('concentrationMgMl').value.trim(), concentrationVerified: field('concentrationVerified').checked,
      components: field('kind').value === 'blend' ? Array.from(components.querySelectorAll<HTMLElement>('[data-component]')).map(row => ({ name: row.querySelector<HTMLInputElement>('[data-component-name]')!.value.trim(), amountMg: row.querySelector<HTMLInputElement>('[data-component-amount]')!.value.trim() })) : [],
    };
    let product: Product;
    try { product = validateProduct(raw); }
    catch (caught) { track('product_entry_error', { operation: editing ? 'update' : 'create', error_code: 'invalid_label' }); error.textContent = uiError(caught); error.tabIndex = -1; error.focus(); return; }
    leaving = true; el<HTMLButtonElement>('product-save').disabled = true;
    try { await saveProduct(product); }
    catch (caught) { leaving = false; el<HTMLButtonElement>('product-save').disabled = false; track('product_entry_error', { operation: editing ? 'update' : 'create', error_code: 'storage_unavailable' }); error.textContent = uiError(caught); status.textContent = ui('Your form is still here. Nothing was saved; check browser storage before trying again.'); return; }
    leaving = true; el<HTMLButtonElement>('product-save').disabled = true;
    trackThenNavigate('product_saved', { product_type: product.kind, operation: editing ? 'update' : 'create' }, `${localePath('/products', browserLocale())}#product=${encodeURIComponent(product.id)}`);
  });
  el<HTMLButtonElement>('product-save').disabled = blocked;
  el<HTMLButtonElement>('product-continue').disabled = false;
  form.dataset.ready = 'true';
}
