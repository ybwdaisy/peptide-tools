export const QA_STORAGE_KEY = 'peptide-tools.analytics-qa.v1';
let inMemoryQa = false;

// A manual reset never overrides an automated browser.
export function resolveQaFlag(search: string, stored = false, automated = false): boolean {
  const params = new URLSearchParams(search);
  const choice = params.get('analytics_test') ?? params.get('qa');
  return automated || choice === '1' || (choice !== '0' && stored);
}

// Capture the flag before consent, and preserve it through full-page navigation.
export function isQaTraffic(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const params = new URLSearchParams(search);
  const reset = (params.get('analytics_test') ?? params.get('qa')) === '0';
  const stores = [() => sessionStorage, () => localStorage];
  let stored = inMemoryQa;
  let available = 0;
  for (const getStore of stores) {
    try {
      const value = getStore().getItem(QA_STORAGE_KEY);
      stored ||= value === '1' || value === 'yes';
      available++;
    } catch { /* Block collection when neither storage area can be read. */ }
  }
  const automated = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const qa = available === 0 || resolveQaFlag(search, stored, automated);
  inMemoryQa = qa;
  for (const getStore of stores) {
    try {
      if (qa) getStore().setItem(QA_STORAGE_KEY, '1');
      else if (reset) getStore().removeItem(QA_STORAGE_KEY);
    } catch { /* The automation check and this-document flag still apply. */ }
  }
  return qa;
}
