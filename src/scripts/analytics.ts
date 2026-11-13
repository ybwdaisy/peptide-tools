import { ui } from '../lib/i18n';
import { EVENT_NAMES, NAVIGATION_ACTIONS, eventParams, safeCampaign, safePage, safeReferrer, type AnalyticsEvent } from '../lib/analytics-policy';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }
const CONSENT_KEY = 'peptide-tools.analytics-consent.v1';
const STARTS_KEY = 'peptide-tools.analytics-starts.v2';
// Explicit acceptance sessions are labelled throughout navigation, never inferred from user inputs.
const QA_KEY = 'peptide-tools.analytics-qa.v1';
let qa = new URLSearchParams(location.search).get('analytics_test') === '1';
try { qa ||= sessionStorage.getItem(QA_KEY) === '1'; if (qa) sessionStorage.setItem(QA_KEY, '1'); } catch { /* Current-page QA label still applies. */ }
// Existing page_group reports can exclude QA immediately, before a new GA4 dimension propagates.
const pageMetadata = () => ({ ...safePage(location.pathname), ...(qa ? { page_group: 'qa' } : {}) });
const traffic = { traffic_class: qa ? 'qa' : 'public', ...(qa ? { debug_mode: true } : {}) };
let consent = false, ready = false;
let starts = new Set<string>();
const campaign = safeCampaign(location.search);
const referrer = safeReferrer(document.referrer);
function readChoice() { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } }
function writeChoice(value: string) { try { localStorage.setItem(CONSENT_KEY, value); } catch { /* This-page consent remains usable without storage. */ } }
function configuration() { return document.documentElement.dataset.languageRedirect !== 'true' && location.origin === document.body.dataset.analyticsOrigin && document.body.dataset.analyticsEnabled === 'true' && /^G-[A-Z0-9]+$/.test(document.body.dataset.gaId ?? ''); }
function initialize() {
  if (ready || !consent || !configuration()) return;
  ready = true;
  const id = document.body.dataset.gaId!;
  window.dataLayer = [];
  window.gtag = function (..._args: unknown[]) { window.dataLayer!.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  // Apply privacy defaults before the tag initializes any remotely configured destination.
  window.gtag('set', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...traffic, ...pageMetadata(), page_referrer: referrer, ...campaign });
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: location.hostname, cookie_flags: 'SameSite=Lax;Secure', ...traffic, ...pageMetadata(), page_referrer: referrer, ...campaign });
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
  window.gtag?.('event', event, { ...traffic, ...pageMetadata(), page_referrer: referrer, ...campaign, ...eventParams(event, values) });
}
export function trackStart(event: 'calculator_start' | 'planner_start' | 'product_entry_start', values: Record<string, unknown> = {}) {
  const params = eventParams(event, values);
  const key = `${event}:${params.operation ?? params.tool_context ?? ''}`;
  if (!consent || starts.has(key) || !ready) return;
  starts.add(key);
  try { sessionStorage.setItem(STARTS_KEY, JSON.stringify([...starts])); } catch { /* Fall back to this page. */ }
  track(event, params);
}
function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name && /^_ga(?:_|$)/.test(name)) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
  }
}
export function initAnalytics() {
  try { const saved = JSON.parse(sessionStorage.getItem(STARTS_KEY) ?? '[]'); if (Array.isArray(saved)) starts = new Set(saved.filter(x => typeof x === 'string' && /^(calculator_start|planner_start|product_entry_start):(create|update|standalone|product)?$/.test(x))); } catch { /* Fresh session. */ }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event instanceof MouseEvent && event.button !== 0) return;
    const control = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-action]') : null;
    const action = control?.dataset.analyticsAction;
    if (control && !control.matches(':disabled, [aria-disabled="true"]') && NAVIGATION_ACTIONS.includes(action as typeof NAVIGATION_ACTIONS[number])) track('navigation_action', { action });
  });
  const panel = document.querySelector<HTMLElement>('#analytics-choice');
  const status = document.querySelector<HTMLElement>('#analytics-status');
  const choice = readChoice();
  consent = choice === 'granted';
  if (panel) panel.hidden = choice !== null;
  function renderStatus() { if (status) status.textContent = consent ? ui('Optional analytics: allowed.') : ui('Optional analytics: off.'); }
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
