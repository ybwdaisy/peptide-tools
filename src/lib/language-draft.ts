import { basePath, browserLocale, type Locale } from './i18n';
const KEY = 'peptide-tools.language-draft.v1';
export type DraftItem = Record<string, string>;
interface Draft { route: string; locale: Locale; expires: number; values: Record<string, string>; items: DraftItem[]; editingId?: string; revision?: string; step?: string; generated: boolean }
const meta = ['protocolName', 'timeZone', 'startDate', 'endDate'];
const calculator = ['concentration', 'dose', 'unit', 'useSyringe', 'capacity', 'increment'];
const productFields = ['productName', 'brand', 'kind', 'form', 'amountMg', 'identityConfirmed', 'concentrationMgMl', 'concentrationVerified'];
function values(form: HTMLFormElement, names: string[]) {
  return Object.fromEntries(names.map(name => { const field = form.elements.namedItem(name) as HTMLInputElement | null; return [name, field?.type === 'checkbox' ? String(field.checked) : field?.value ?? '']; }));
}
export function saveLanguageDraft(locale: Locale) {
  const form = document.querySelector<HTMLFormElement>('#calculator-form, #planner-form, #product-form');
  if (!form) return;
  const items = Array.from(form.querySelectorAll<HTMLElement>('.protocol-item')).map(row => ({
    ...Object.fromEntries(Array.from(row.querySelectorAll<HTMLInputElement>('[data-field]')).map(field => [field.dataset.field!, field.value])),
    id: row.dataset.id!, product: row.dataset.product ?? '', weekdays: Array.from(row.querySelectorAll<HTMLInputElement>('[data-weekday]:checked')).map(field => field.value).join(','),
  }));
  const componentDrafts = Array.from(form.querySelectorAll<HTMLElement>('[data-component]')).map(row => ({ name: row.querySelector<HTMLInputElement>('[data-component-name]')?.value ?? '', amountMg: row.querySelector<HTMLInputElement>('[data-component-amount]')?.value ?? '' }));
  const draft: Draft = { route: basePath(location.pathname), locale, expires: Date.now() + 60_000, values: { ...values(form, form.id === 'planner-form' ? meta : form.id === 'product-form' ? productFields : calculator), ...(form.id === 'calculator-form' ? { basis: document.querySelector<HTMLSelectElement>('#calculation-basis')?.value ?? '' } : {}) }, items: form.id === 'product-form' ? componentDrafts : items, editingId: form.dataset.editingId, revision: form.dataset.revision, step: form.dataset.step, generated: document.getElementById('generated-calendar')?.hidden === false };
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* Tools and language links still work without storage. */ }
}
export function takeLanguageDraft(): Draft | undefined {
  try {
    const raw = sessionStorage.getItem(KEY); if (!raw) return;
    sessionStorage.removeItem(KEY);
    if (raw.length > 128_000) return;
    const draft = JSON.parse(raw) as Draft;
    if (draft.route !== basePath(location.pathname) || draft.locale !== browserLocale() || !Number.isFinite(draft.expires) || draft.expires < Date.now() || draft.expires > Date.now() + 60_000) return;
    const valid = (value: unknown): value is Record<string, string> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length <= 16 && Object.entries(value).every(([key, v]) => typeof v === 'string' && v.length <= (key === 'product' ? 16000 : 100));
    if (!valid(draft.values) || !Array.isArray(draft.items) || draft.items.length > 20 || !draft.items.every(valid)) return;
    return draft;
  } catch { return; }
}
