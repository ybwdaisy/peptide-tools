# Verification and remaining work

Date: 2026-11-12. This report distinguishes local checks, browser simulation and production acceptance.

## Implemented

- Astro/TypeScript static site: home, calculator, 16 sourced references, local planner, privacy, disclaimer and 404.
- Decimal arithmetic, explicitly selected U-100 scale, capacity/graduation checks, no dose recommendations.
- Four recurrence rules, inclusive cycle dates, time-zone-aware instants, DST-gap errors and first repeated-time occurrence.
- Local save/load/delete, validated version-1 JSON backup/restore, corruption protection, ICS without alarms, full-cycle printing.
- Consent-first event integration, fixed parameter allowlists, generic reference page analytics, preview exclusion, withdrawal reload.
- Independent private GitHub repository and Vercel project. PR #1 merged with owner authorization; production and the custom domain are live. Production GA4 collection is active after PR #2 fixed the real-SDK privacy issue and final acceptance passed.

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

The final production collection test used a fresh headed Chrome profile, actual deployed code and the real Google SDK. All nine business event types and exact counts passed; every inspected packet had generic locations/titles and allowed parameters. No Google requests occurred before consent or after withdrawal. Realtime and DebugView received the acceptance events, including the three key events and print intent. See `analytics-setup.md` and `docs/evidence/` for timestamps, counts and limitations.

## Analytics and search configuration

- Existing owner-selected main stream `16326517771` / `G-B34CBGW0EF`; shared property `494048879`. PolicyPilot's separate stream/reports preserved.
- Enhanced measurement off with explicit owner authorization; generic global privacy defaults set before tag initialization. PR #2 passed CI, including the full browser suite.
- Three custom dimensions and three key events saved. Seven-tab acquisition/tools analysis and separate daily retention analysis saved and reopened for verification.
- Every business view uses an event-scoped exact-hostname segment, excluding launch QA date 20261112. Successful-calculator MAU uses **Total users only**; validation failure share uses success/error Event count in a doughnut. Confirm current dates before review; retention range needs 31–60 days to inspect day 30.
- Report configuration and live collection acceptance are complete. Processed custom dimensions, real 7/30-day returns and organic performance need time and real visitors; QA counts are not demand evidence.
- Search Console URL-prefix ownership auto verified; sitemap reports Success with 22 discovered pages. Calculator and reference initial inspections were unknown to Google. An indexing-request receipt was not confirmed; actual crawling/indexing remains pending.

## Remaining external/device checks

- Physical iPhone Safari and import into the owner's chosen calendar application. Chrome/WebKit iPhone simulation passed, not physical-device acceptance.
- Actual OS print dialog and paper output. Final analytics trace intercepted the print API, verifying invocation and SDK intent only; print layouts were checked separately.
- Vercel GitHub App repository access for automatic Git deployment. Authenticated CLI deployment works and production is live.
- Natural Google crawling/indexing, processed reports and mature day-7/day-30 cohorts.

No Google passwords, session cookies or tokens were requested or copied. Administrative work used authenticated visible UI controls.

## Independent review resolution

1. Desktop calendar time/name and dose now occupy separate layout rows; the recapture shows distinct lines.
2. Phone schedule tables retain the dose column; the recapture shows all three fields.

No stock media, invented testimonials or customer metrics are used. No imagery slots need replacement.

## Release boundary

Production, custom domain, GA4 live event acceptance, saved analysis views, Search Console ownership and sitemap submission are complete. Actual indexing and mature visitor/retention results are pending external processing and usage. See `release.md` for deployment/DNS/rollback and `analytics-setup.md` for report links, definitions and evidence.
