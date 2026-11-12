# Verification and remaining work

Date: 2026-11-12. This report distinguishes local checks, browser simulation and production acceptance.

## Implemented

- Astro/TypeScript static site: home, calculator, 16 sourced references, local planner, privacy, disclaimer and 404.
- Decimal arithmetic, explicitly selected U-100 scale, capacity/graduation checks, no dose recommendations.
- Four recurrence rules, inclusive cycle dates, time-zone-aware instants, DST-gap errors and first repeated-time occurrence.
- Local save/load/delete, validated version-1 JSON backup/restore, corruption protection, ICS without alarms, full-cycle printing.
- Consent-first event integration, fixed parameter allowlists, generic reference page analytics, preview exclusion, withdrawal reload.
- Independent private GitHub repository and independent Vercel project. Production GA4 Measurement ID configured. Two first-deploy attempts were unexpectedly classified as production by Vercel and removed; there is no retained production release or custom-domain assignment.

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

## Analytics: implemented versus verified

Configured public identifiers: stream `16326517771`, Measurement ID `G-B34CBGW0EF`. Only the production Vercel environment holds the Measurement ID.

Automated analytics acceptance stubs the Google tag download and inspects the actual application's dataLayer command contract. No real Google collection requests are sent by these tests. This verifies consent gating, allowlists and action counts; it does **not** prove real GA4 reception, automatic Google-tag behavior, key-event configuration or processed reports.

Pending before launch:

- Google account/property access and confirmation of stream website.
- GA4 Enhanced measurement and advertising settings, custom dimensions, key events, funnels and return-usage reports.
- Search Console property access/verification and sitemap submission.
- Production domain/DNS/TLS, approved merge/release, actual outgoing Google requests, Realtime/DebugView and processed-report verification.
- Physical iPhone Safari acceptance and import into the owner's chosen calendar application. Generated ICS syntax, instants, downloads and no-alarm behavior are tested locally.
- A remote review deployment: the platform forced both requested Preview and explicit staging first-deploy attempts to production, so both were removed rather than retained as previews. Local static preview and PR remain available. The Vercel GitHub App also lacks access to this new private repository.

The computer-use connection timed out when opening Google Analytics. No Google credentials were requested or copied; administrative actions remain unverified. See `analytics-setup.md` for the concrete remaining steps.

## Independent review resolution

1. Desktop calendar time/name and dose now occupy separate layout rows; the recapture shows distinct lines.
2. Phone schedule tables retain the dose column; the recapture shows all three fields.

No stock media, invented testimonials or customer metrics are used. No imagery slots need replacement.

## Release boundary

The custom subdomain and production remain pending owner approval. Preview deployment, PR and CI results are recorded in the delivery message; a completed local check is never used as a substitute for remote CI or production acceptance.
