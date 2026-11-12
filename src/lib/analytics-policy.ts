export const EVENT_NAMES = ['page_view', 'calculator_start', 'calculation_success', 'calculation_error', 'planner_start', 'schedule_generated', 'protocol_saved', 'export_completed', 'print_requested'] as const;
export type AnalyticsEvent = typeof EVENT_NAMES[number];
export type PageGroup = 'home' | 'calculator' | 'library' | 'library_detail' | 'planner' | 'privacy' | 'disclaimer' | 'not_found';
const paths: Record<PageGroup, string> = { home: '/', calculator: '/calculator', library: '/library', library_detail: '/library/detail', planner: '/planner', privacy: '/privacy', disclaimer: '/disclaimer', not_found: '/404' };
export function pageGroup(path: string): PageGroup {
  const p = path.replace(/\/+$/, '') || '/';
  if (p.startsWith('/library/')) return 'library_detail';
  return (Object.keys(paths) as PageGroup[]).find(k => paths[k] === p) ?? 'not_found';
}
export function safePage(path: string) { const group = pageGroup(path); return { page_group: group, page_location: `https://peptides.ybwdaisy.com${paths[group]}`, page_title: `Peptide Tools: ${group.replace('_', ' ')}` }; }
export function safeReferrer(raw: string) {
  try { const url = new URL(raw); if (url.hostname === 'peptides.ybwdaisy.com' || !['http:', 'https:'].includes(url.protocol)) return ''; return url.origin; } catch { return ''; }
}
export function safeCampaign(search: string): Record<string, string> {
  const query = new URLSearchParams(search);
  const allowed: Record<string, string[]> = { utm_source: ['google', 'bing', 'reddit', 'newsletter', 'direct', 'github', 'x'], utm_medium: ['organic', 'social', 'email', 'referral'], utm_campaign: ['launch', 'tools', 'reference'] };
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(allowed)) { const value = query.get(key)?.toLowerCase(); if (value && values.includes(value)) result[key === 'utm_campaign' ? 'campaign_name' : key.replace('utm_', 'campaign_')] = value; }
  return result;
}
export function eventParams(event: AnalyticsEvent, values: Record<string, unknown> = {}): Record<string, string> {
  if (!EVENT_NAMES.includes(event)) return {};
  const out: Record<string, string> = {};
  if (event === 'calculation_error' && ['required', 'invalid_number', 'capacity_exceeded'].includes(String(values.error_code))) out.error_code = String(values.error_code);
  if (event === 'export_completed' && ['ics', 'json'].includes(String(values.export_type))) out.export_type = String(values.export_type);
  return out;
}
