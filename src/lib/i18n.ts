import chinese from '../i18n/zh.json';
export type Locale = 'en' | 'zh';
export const LANGUAGE_KEY = 'peptide-tools.language.v1';
export const messages: Record<string, string> = chinese;
export function getLocale(path: string): Locale { return /^\/zh(?:\/|$)/.test(path) ? 'zh' : 'en'; }
export function basePath(path: string) { return path.replace(/^\/zh(?=\/|$)/, '').replace(/\/+$/, '') || '/'; }
export function localePath(path: string, locale: Locale) { const base = basePath(path); return locale === 'zh' ? `/zh${base === '/' ? '' : base}` : base; }
export function translate(message: string, locale: Locale) { return locale === 'zh' ? (messages[message] || message) : message; }
export function formatMessage(message: string, locale: Locale, values: Record<string, string | number> = {}) {
  return translate(message, locale).replace(/\{(\w+)\}/g, (placeholder, key: string) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
}
export function browserLocale(): Locale { return typeof document !== 'undefined' && document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'; }
export function ui(message: string, values: Record<string, string | number> = {}) { return formatMessage(message, browserLocale(), values); }
export function uiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'The operation could not be completed. Check your entries.';
  if (browserLocale() === 'en' || messages[message]) return ui(message);
  const clock = /^(\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2}) does not exist in (.+) because of a clock change\. Choose another time\.$/.exec(message);
  return clock ? ui('{date} at {time} does not exist in {zone} because of a clock change. Choose another time.', { date: clock[1]!, time: clock[2]!, zone: clock[3]! }) : ui('The operation could not be completed. Check your entries.');
}
