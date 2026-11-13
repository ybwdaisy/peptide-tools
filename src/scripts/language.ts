import { LANGUAGE_KEY, browserLocale } from '../lib/i18n';
import { saveLanguageDraft } from '../lib/language-draft';
export function initLanguage() {
  try {
    if (location.pathname === '/' && localStorage.getItem(LANGUAGE_KEY) === 'zh') {
      document.documentElement.dataset.languageRedirect = 'true';
      location.replace('/zh' + location.search + location.hash);
      return;
    }
  } catch { /* English remains the default without storage. */ }
  document.querySelectorAll<HTMLAnchorElement>('[data-language]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const language = link.dataset.language === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Explicit links still work without storage. */ }
    if (language === browserLocale()) { event.preventDefault(); return; }
    saveLanguageDraft(language);
    link.hash = location.hash;
  }));
}
