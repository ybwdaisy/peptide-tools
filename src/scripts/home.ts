import { readWorkspace } from '../lib/workspace';
import { ui, browserLocale, localePath } from '../lib/i18n';

export function initHome() {
  const example = document.getElementById('label-example')?.closest('details');
  const revealExample = () => { if (example) example.open = true; };
  document.querySelector('[data-analytics-action="view_label_example"]')?.addEventListener('click', revealExample);
  if (location.hash === '#label-example') revealExample();
  const returning = document.getElementById('home-return');
  if (!returning) return;
  try {
    const saved = readWorkspace();
    returning.hidden = !(saved.products.length || saved.protocols.length || saved.calculations.length || saved.records.length);
    const primary = document.getElementById('home-return-heading') as HTMLAnchorElement;
    if (saved.protocols.length || saved.records.length) {
      primary.textContent = ui('Open today'); primary.href = localePath('/today', browserLocale()); primary.dataset.analyticsAction = 'open_today';
    } else if (!saved.products.length && saved.calculations.length) {
      primary.textContent = ui('Open saved calculations'); primary.href = localePath('/calculator', browserLocale()) + '#saved-calculations'; primary.dataset.analyticsAction = 'resume_calculation';
    }
    const addProduct = document.querySelector('[data-analytics-action="add_product"]');
    addProduct?.classList.toggle('secondary', !returning.hidden);
    if (addProduct && saved.products.length) addProduct.textContent = ui('Add another product');
  } catch {
    // A read failure never modifies existing records or blocks the first-use paths.
    returning.hidden = true;
  }
}
