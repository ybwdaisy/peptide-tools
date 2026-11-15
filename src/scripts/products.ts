import { browserLocale, localePath, ui, uiError } from '../lib/i18n';
import { canCalculateProduct, matchingReference, type Product } from '../lib/products';
import { readWorkspace, deleteProduct, clearWorkspace, type Workspace } from '../lib/workspace';
import { STORAGE_KEY } from '../lib/backup';
import { track } from './analytics';

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (cls) value.className = cls; return value;
}
export function initProducts() {
  if (!document.getElementById('product-workspace')) return;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const path = (route: string) => localePath(route, browserLocale());
  let workspace: Workspace = { version: 3, products: [], protocols: [], calculations: [] };
  let readable = false;
  function link(label: string, href: string, cls = 'text-link') { const a = node('a', label, cls); a.href = href; if (href.includes('#protocol=')) a.dataset.analyticsAction = 'open_schedule'; return a; }
  function amount(product: Product) { return product.amountMg ? ui(product.kind === 'blend' ? '{amount} mg total in one vial' : '{amount} mg in one vial', { amount: product.amountMg }) : ui('Amount not added'); }
  function formName(product: Product) { return ui(({ powder: 'Lyophilized powder', solution: 'Solution', other: 'Other / not specified' } as const)[product.form]); }
  function state(product: Product) {
    if (!product.identityConfirmed) return ui('Version needs confirmation');
    if (product.kind === 'blend' && (!product.amountMg || product.components.some(component => !component.amountMg))) return ui('Ingredient amounts need confirmation');
    if (!product.concentrationMgMl) return ui('Concentration not added');
    if (!product.concentrationVerified) return ui('Concentration needs confirmation');
    return ui('Label fields confirmed by you');
  }
  function fact(list: HTMLElement, label: string, value: string) { const row = node('div'); row.append(node('dt', label), node('dd', value)); list.append(row); }
  function productLink(product: Product) {
    const a = link(product.name, `${path('/products')}#product=${encodeURIComponent(product.id)}`, 'product-record-link');
    a.addEventListener('click', () => track('product_opened', { product_type: product.kind })); return a;
  }
  function render() {
    el('workspace-error').textContent = '';
    try { workspace = readWorkspace(); readable = true; }
    catch { readable = false; el('workspace-error').textContent = ui('Saved data could not be read. Nothing has been overwritten. Restore a valid backup or clear local data before saving.'); }
    el('workspace-loading').hidden = true;
    el('products-empty').hidden = !readable || workspace.products.length > 0;
    el('product-add-action').hidden = !readable || !workspace.products.length;
    el<HTMLButtonElement>('workspace-backup-export').disabled = !readable || !(workspace.products.length || workspace.protocols.length || workspace.calculations.length);
    const list = el('product-list'); list.replaceChildren();
    if (readable) for (const product of workspace.products) {
      const li = node('li', undefined, 'product-record'), main = node('div', undefined, 'product-record-main');
      const title = node('h2'); title.append(productLink(product));
      main.append(title, node('p', amount(product), 'product-quantity'));
      if (product.brand) main.append(node('p', product.brand, 'small'));
      if (product.kind === 'blend') {
        const ingredients = node('ul', undefined, 'product-ingredient-list');
        product.components.forEach(component => ingredients.append(node('li', component.amountMg ? `${component.name}: ${component.amountMg} mg` : `${component.name}: ${ui('Unknown')}`))); main.append(ingredients);
      }
      if (!canCalculateProduct(product)) main.append(node('p', state(product), 'small product-record-state'));
      li.append(main); list.append(li);
    }
    const schedules = el('product-schedule-list'); schedules.replaceChildren();
    el('product-schedules-empty').hidden = !readable || !!workspace.protocols.length;
    if (readable) for (const protocol of workspace.protocols) {
      const row = node('li', undefined, 'product-schedule-record'), info = node('div');
      info.append(node('h3', protocol.name), node('p', protocol.items.map(item => item.label).join(', '), 'small'));
      row.append(info, link(ui('Open my schedule'), `${path('/planner')}#protocol=${encodeURIComponent(protocol.id)}`, 'button')); schedules.append(row);
    }
    renderDetail();
  }
  function renderDetail() {
    const id = new URLSearchParams(location.hash.slice(1)).get('product');
    const product = readable ? workspace.products.find(p => p.id === id) : undefined;
    el('product-overview').hidden = !!product; el('product-detail').hidden = !product;
    if (id && readable && !product) el('workspace-error').textContent = ui('This product is no longer saved in this browser.');
    if (!product) return;
    el('product-detail-name').textContent = product.name; el('product-detail-brand').textContent = product.brand;
    const facts = el('product-detail-facts'); facts.replaceChildren();
    fact(facts, ui('Amount in one vial'), amount(product)); fact(facts, ui('Form on the label'), formName(product));
    fact(facts, ui('Product type'), ui(product.kind === 'single' ? 'Single ingredient' : 'Blend'));
    fact(facts, ui('Label identity'), ui(product.identityConfirmed ? 'Confirmed by you' : 'Needs confirmation'));
    fact(facts, ui(product.kind === 'blend' ? 'Total mixture concentration' : 'Concentration'), product.concentrationMgMl ? `${product.concentrationMgMl} mg/mL (${ui(product.concentrationVerified ? 'confirmed by you' : 'not verified')})` : ui('Not added'));
    el('product-detail-ingredients').hidden = product.kind !== 'blend';
    const ingredients = el('product-ingredient-facts'); ingredients.replaceChildren();
    product.components.forEach(component => fact(ingredients, component.name, component.amountMg ? `${component.amountMg} mg` : ui('Unknown')));
    const eligible = canCalculateProduct(product);
    el<HTMLDetailsElement>('product-detail-notes').open = !eligible;
    el('product-detail-notice').textContent = eligible ? ui('These are your label inputs, not a quality or safety assessment. Enter your own planned amount to calculate volume.') : ui('You can organize a schedule now. Volume calculation needs a confirmed label, verified concentration and known blend amounts.');
    const plan = el<HTMLAnchorElement>('product-plan-link'); plan.href = `${path('/planner')}#product=${encodeURIComponent(product.id)}`;
    const calculator = el<HTMLAnchorElement>('product-calculate-link'); calculator.href = `${path('/calculator')}#product=${encodeURIComponent(product.id)}`; calculator.hidden = !eligible; el('product-calculate-disabled').hidden = eligible;
    el<HTMLAnchorElement>('product-edit-link').href = `${path('/products/new')}#edit=${encodeURIComponent(product.id)}`;
    const reference = matchingReference(product); el('product-reference-link').hidden = !reference; el('product-reference-unmatched').hidden = !!reference;
    if (reference) el<HTMLAnchorElement>('product-reference-link').href = path(`/library/${reference}`);
    const related = workspace.protocols.filter(protocol => protocol.items.some(item => item.product?.id === product.id));
    el('product-related-empty').hidden = !!related.length;
    el('product-related-list').replaceChildren(...related.map(protocol => { const row = node('li'); row.append(link(protocol.name, `${path('/planner')}#protocol=${encodeURIComponent(protocol.id)}`)); return row; }));
  }
  window.addEventListener('hashchange', () => { render(); if (!el('product-detail').hidden) el('product-detail-name').focus(); });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) render(); });
  el('product-delete').addEventListener('click', () => {
    const id = new URLSearchParams(location.hash.slice(1)).get('product'), product = workspace.products.find(p => p.id === id); if (!product) return;
    if (!confirm(ui('Delete “{name}” from your products? Existing schedules keep their saved product details.', { name: product.name }))) return;
    try { deleteProduct(product.id); track('product_deleted', { product_type: product.kind }); history.replaceState(null, '', path('/products')); render(); el('workspace-status').textContent = ui('Product record deleted. Existing schedules were kept.'); }
    catch (caught) { el('workspace-status').textContent = uiError(caught); }
  });
  el('workspace-clear').addEventListener('click', () => {
    if (!confirm(ui('Delete all saved products, schedules and calculations from this browser? Download a backup first if you need a copy.'))) return;
    try { clearWorkspace(); history.replaceState(null, '', path('/products')); render(); el('workspace-status').textContent = ui('Saved local data cleared. Downloaded files are unchanged.'); }
    catch { el('workspace-status').textContent = ui('Storage is unavailable. Saved data could not be cleared.'); }
  });
  window.addEventListener('workspace-restored', render);
  if (location.hash === '#workspace-data-heading') document.querySelector<HTMLDetailsElement>('.workspace-data')!.open = true;
  render();
}
