# Verification and remaining work

Date: 2026-11-12. This report distinguishes local checks, browser simulation and production acceptance.

## Implemented

- Astro/TypeScript static site: home, calculator, 16 sourced references, local planner, privacy, disclaimer and 404.
- Decimal arithmetic, explicitly selected U-100 scale, capacity/graduation checks, no dose recommendations.
- Four recurrence rules, inclusive cycle dates, time-zone-aware instants, DST-gap errors and first repeated-time occurrence.
- Local save/load/delete, validated version-1 JSON backup/restore, corruption protection, ICS without alarms, full-cycle printing.
- Consent-first event integration, fixed parameter allowlists, generic reference page analytics, preview exclusion, withdrawal reload.
- Independent private GitHub repository and Vercel project. PR #1 merged with owner authorization; production and the custom domain are live. GA collection is currently paused after real Google SDK acceptance failed the privacy requirements.

## Passed locally

| Check | Result |
|---|---|
| Astro/TypeScript | 0 errors, 0 warnings |
| Domain unit tests | 18 passed |
| Static build | 23 HTML pages |
| Metadata / local links / assets / sitemap | Passed, 22 sitemap URLs |
| Browser E2E | 26 passed: 13 installed Chrome + 13 WebKit with iPhone 13 emulation |
| Dependency audit after Puppeteer update | 0 reported vulnerabilities |
| Hallmark app-scope static + Chrome render | 0 FAIL, 0 REFLEX, 0 WARN |
| Fresh-context independent UI review | 2 defects fixed and checked against recaptured desktop/phone calendar states |

Production-build indexing flags and Measurement ID were checked against generated HTML/robots without opening a browser or sending Google events; the local output was then restored to a no-analytics preview build. The application additionally requires the exact approved production origin at runtime.

Browser scenarios include success/error, device capacity, storage unavailable/corrupt, backup restore and malformed imports, leap day, local filtering, JavaScript-disabled references, direct routes/404, overflow, consent denial, withdrawal and exact action-event counts. Unit tests cover all recurrence rules, UTC offset changes, missing/repeated clock times, ICS escaping/folding and analytics sanitization.

An initial developer-server test encountered toolbar overlays and WebKit action timeouts. Those captures were replaced and final browser verification ran against the static build preview, with no Astro developer toolbar. This is not a physical-iPhone test.

## Production browser acceptance

The real HTTPS custom hostname passed Chrome and WebKit/iPhone 13 simulation checks: seven primary routes, calculator output, schedule generation, browser save, ICS download start, canonical URLs, indexing flags, overflow and real 404 status. No page errors or Google requests occurred after declining consent. This does not constitute a physical-iPhone test.

After analytics was paused, a fresh production Chrome session accepted analytics and successfully calculated 0.05 mL from the test inputs; `data-analytics-enabled` was `false` and Google request count was zero (2026-11-12T11:23:13Z).

## Analytics: partial configuration, acceptance failed

The owner selected the existing main-site stream `16326517771`, Measurement ID `G-B34CBGW0EF`, under property `494048879`. The property also contains PolicyPilot; existing events and reports were preserved.

Saved and confirmed in the backend:

- Event-scoped dimensions `Peptides page group` (`page_group`), `Peptides error category` (`error_code`), `Peptides export type` (`export_type`).
- Key events `calculation_success`, `schedule_generated`, `protocol_saved`, once per event with no default monetary value.
- Saved comparison `Peptides — peptides.ybwdaisy.com`: hostname contains the full subdomain. New hostname values are not yet available in the standard comparison's exact-match value list.
- A separate Tools exploration is being configured with an exact hostname filter. Completed tabs and remaining definitions are recorded in `analytics-setup.md`.

The earlier automated tests stubbed the tag download; those tests verify the app's command contract, not Google's automatic behavior. A real production browser test on 2026-11-12T11:19:13Z–11:19:32Z used fictitious canary inputs and the unmodified Google SDK. Collection responses returned 204 for manual calculation/planner events, but extra automatic `page_view` and `form_start` events also appeared. An automatic library page view included the real `/library/cjc-1295` path and specific page title. No canary protocol/item content appeared in the captured requests. These QA events are not demand evidence.

The attempted debug queue flags were not present in outgoing events, and DebugView did not show a debugging device. Neither 204 collection responses nor report setup counts as a successful Realtime/DebugView acceptance. Export, print, exact counts, withdrawal and processed reports still need live re-verification after configuration is corrected.

Enhanced measurement was disabled on the shared stream after explicit owner confirmation; the off state was checked in the UI. An additional application change sets global privacy defaults before tag initialization. A safe synthetic-page candidate test with the real SDK produced one generic page view. Four targeted Chrome regressions, 18 unit tests, type checking and build passed. Only this Vercel project's public Measurement ID was removed and production rebuilt to pause collection. Restoration still requires full request sanitization/count verification and backend acceptance.

Still required:

- Full candidate and production network/Realtime/DebugView acceptance; restore collection only after privacy/count checks pass.
- All acquisition, funnel, 7/30-day retention, rolling-30-day unique calculator users and error reports saved and verified with valid data. Exclude QA traffic.
- Search Console page-level indexing follow-up: URL-prefix ownership auto verified; sitemap submitted with Success and 22 discovered pages. Calculator initially unknown to Google; an indexing request was initiated. Reference inspection and actual indexing are not yet complete.
- Physical iPhone Safari acceptance and importing ICS into the owner's chosen calendar application.
- Vercel GitHub App repository access for automatic deployments. CLI production deployment works.

No Google passwords, session cookies or tokens were requested or copied. Administrative work used already authenticated visible UI controls.

## Independent review resolution

1. Desktop calendar time/name and dose now occupy separate layout rows; the recapture shows distinct lines.
2. Phone schedule tables retain the dose column; the recapture shows all three fields.

No stock media, invented testimonials or customer metrics are used. No imagery slots need replacement.

## Release boundary

Production release and the custom subdomain are complete with owner authorization. GA4 live acceptance and page-level indexing remain incomplete; Search Console ownership and sitemap submission are complete. See `release.md` for deployment IDs, DNS and rollback, and `analytics-setup.md` for account configuration and remaining acceptance.
