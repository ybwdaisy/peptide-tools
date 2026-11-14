import { readWorkspace } from '../lib/workspace';
import { ui } from '../lib/i18n';

export function initHome() {
  const example = document.getElementById('label-example')?.closest('details');
  const revealExample = () => { if (example) example.open = true; };
  document.querySelector('[data-analytics-action="view_label_example"]')?.addEventListener('click', revealExample);
  if (location.hash === '#label-example') revealExample();
  const returning = document.getElementById('home-return');
  if (!returning) return;
  try {
    const saved = readWorkspace();
    returning.hidden = saved.products.length === 0 && saved.protocols.length === 0;
    const addProduct = document.querySelector('[data-analytics-action="add_product"]');
    addProduct?.classList.toggle('secondary', !returning.hidden);
    if (addProduct && !returning.hidden) addProduct.textContent = ui('Add another product');
  } catch {
    // A read failure never modifies existing records or blocks the first-use paths.
    returning.hidden = true;
  }
}
