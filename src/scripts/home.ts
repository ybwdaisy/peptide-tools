import { readWorkspace } from '../lib/workspace';

export function initHome() {
  const returning = document.getElementById('home-return');
  if (!returning) return;
  try {
    const saved = readWorkspace();
    returning.hidden = saved.products.length === 0 && saved.protocols.length === 0;
  } catch {
    // A read failure never modifies existing records or blocks the first-use paths.
    returning.hidden = true;
  }
}
