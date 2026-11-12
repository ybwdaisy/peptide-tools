import { EVENT_NAMES, eventParams, safeCampaign, safePage, safeReferrer, type AnalyticsEvent } from '../lib/analytics-policy';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }
const CONSENT_KEY = 'peptide-tools.analytics-consent.v1';
const STARTS_KEY = 'peptide-tools.analytics-starts.v1';
let consent = false, ready = false;
let starts = new Set<string>();
const campaign = safeCampaign(location.search);
const referrer = safeReferrer(document.referrer);
function readChoice() { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } }
function writeChoice(value: string) { try { localStorage.setItem(CONSENT_KEY, value); } catch { /* This-page consent remains usable without storage. */ } }
function configuration() { return location.origin === document.body.dataset.analyticsOrigin && document.body.dataset.analyticsEnabled === 'true' && /^G-[A-Z0-9]+$/.test(document.body.dataset.gaId ?? ''); }
function initialize() {
  if (ready || !consent || !configuration()) return;
  ready = true;
  const id = document.body.dataset.gaId!;
  window.dataLayer = [];
  window.gtag = function (..._args: unknown[]) { window.dataLayer!.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: location.hostname, cookie_flags: 'SameSite=Lax;Secure', ...safePage(location.pathname), page_referrer: referrer, ...campaign });
  const script = document.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.analytics = 'ga4';
  document.head.append(script);
  track('page_view');
}
export function track(event: AnalyticsEvent, values: Record<string, unknown> = {}) {
  if (!consent || !ready || !configuration() || !EVENT_NAMES.includes(event)) return;
  window.gtag?.('event', event, { ...safePage(location.pathname), page_referrer: referrer, ...campaign, ...eventParams(event, values) });
}
export function trackStart(event: 'calculator_start' | 'planner_start') {
  if (!consent || starts.has(event) || !ready) return;
  starts.add(event);
  try { sessionStorage.setItem(STARTS_KEY, JSON.stringify([...starts])); } catch { /* Fall back to this page. */ }
  track(event);
}
function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name && /^_ga(?:_|$)/.test(name)) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
  }
}
export function initAnalytics() {
  try { const saved = JSON.parse(sessionStorage.getItem(STARTS_KEY) ?? '[]'); if (Array.isArray(saved)) starts = new Set(saved.filter(x => ['calculator_start', 'planner_start'].includes(x))); } catch { /* Fresh session. */ }
  const panel = document.querySelector<HTMLElement>('#analytics-choice');
  const status = document.querySelector<HTMLElement>('#analytics-status');
  const choice = readChoice();
  consent = choice === 'granted';
  if (panel) panel.hidden = choice !== null;
  function renderStatus() { if (status) status.textContent = consent ? 'Optional analytics: allowed.' : 'Optional analytics: off.'; }
  renderStatus();
  initialize();
  document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => {
    const granted = button.dataset.consent === 'granted';
    writeChoice(granted ? 'granted' : 'denied');
    consent = granted;
    if (panel) panel.hidden = true;
    renderStatus();
    if (granted) initialize();
    else {
      clearAnalyticsCookies();
      if (ready) {
        // Reload tears down the loaded tag and its timers; no denied-mode pings.
        (window as unknown as Record<string, unknown>)[`ga-disable-${document.body.dataset.gaId}`] = true;
        location.reload();
      }
    }
  }));
  document.querySelectorAll('[data-open-consent]').forEach(button => button.addEventListener('click', () => {
    if (panel) { panel.hidden = false; panel.querySelector<HTMLButtonElement>('button')?.focus(); }
  }));
}
