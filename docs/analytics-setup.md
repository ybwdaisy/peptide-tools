# Analytics configuration and acceptance

Updated: 2026-11-13. **PR #9 is merged/deployed as `d93ee74`; native real-SDK acceptance and GA4 Realtime confirm create/update saves and navigation events.** The usage report now also splits operation, tool context and action. The November 12 acceptance below applies to the earlier release; current evidence and remaining limits are recorded separately. Report availability and QA activity are not evidence of customer demand.

See [product journey event contract and remaining acceptance](analytics-product-journey.md).

## Account and privacy settings

- Account `ybwdaisy` (`359267445`), shared property `494048879`.
- Owner-selected existing main-site stream `主站`, URL `https://ybwdaisy.com`, stream `16326517771`, Measurement ID `G-B34CBGW0EF`.
- Filter Peptide Tools by exact hostname `peptides.ybwdaisy.com`. Do not rename the shared stream or treat its unfiltered totals as this site's results.
- The owner explicitly authorized turning off Enhanced measurement on this shared stream; the off state was verified. PolicyPilot's separate stream and existing reports/key events were preserved.
- Property-wide Signals, advertising links, retention and traffic filters were not changed. The application supplies Google Signals/ad-personalization disabling flags and denied advertising consent; this does not imply those property-wide administrative settings were changed.
- Production ID is active again. Preview/local and Vercel aliases cannot collect because both production configuration and exact runtime origin are required. The Google tag loads only after affirmative analytics consent.

A real-SDK check exposed automatic specific-reference page views despite per-stream defaults. PR #2 fixed this by setting generic page metadata and privacy defaults globally **before SDK initialization**, alongside per-stream/per-event controls. Candidate privacy/count checks passed before production collection resumed; final production checks also passed.

## Saved backend configuration

Event-scoped dimensions (all seven are registered; the four new ones are imported into the main analysis):

| Display name | Parameter |
|---|---|
| Peptides page group | `page_group` |
| Peptides error category | `error_code` |
| Peptides export type | `export_type` |
| Peptides action | `action` |
| Peptides operation | `operation` |
| Peptides tool context | `tool_context` |
| Peptides traffic class | `traffic_class` |

`calculation_success`, `schedule_generated` and `protocol_saved` are key events, once per event, with no default monetary value. Existing key events were retained.

The saved standard comparison `Peptides — peptides.ybwdaisy.com` uses hostname **contains** the full hostname. It is a raw site comparison and includes launch QA. Use the stricter business explorations below when evaluating demand.

The main and retention analyses now use the event-scoped segment **Peptides events (exclude launch day and QA)**:

```
Hostname exactly matches peptides.ybwdaisy.com
AND Date is not 20261112
EXCLUDE events where Peptides page group exactly matches qa
```

The definition was reopened and verified. This conservatively excludes the entire launch QA day; earlier and later launch tests are not customer evidence. New acceptance sessions must start with `?analytics_test=1`: production code sends `traffic_class=qa`, `page_group=qa` and `debug_mode=true` throughout that tab session, including after navigation. The existing page-group dimension supports immediate exclusion. The query itself is never uploaded. November 13 acceptance used QA traffic. The first HAR was incomplete; the later PR #9 run confirms navigation/save reception in Realtime, despite those requests being omitted from preserved HAR. Neither run is customer evidence. Event scope prevents a visitor's activity on another site in the shared property from being counted as peptide-site activity.

## Open the reports

- [Acquisition and tools — 30-day analysis](https://analytics.google.com/analytics/web/#/analysis/a359267445p494048879/edit/EqjrhzZYSeeMpPBtKqUmQA)
- [7/30-day retention — set dates](https://analytics.google.com/analytics/web/#/analysis/a359267445p494048879/edit/ZJ3t4DjYRJ-D1kuSPxXHZg)

The main analysis now has ten saved tabs (numbered display names may appear in a different visual order):

| Tab | Definition |
|---|---|
| 01. Calculator conversion | Closed funnel: calculator page view only → calculator start → successful calculation. Home is no longer counted as a calculator visit. |
| 02. Planner generation | Planner page view → start → generate schedule. Separate from saving. |
| 03. Planner saving | Closed funnel: planner page view → start → successful local save. Generating a calendar and exporting are optional, not prerequisites. |
| 04. Acquisition by channel | Session default channel group, total users and sessions |
| 05. Usage by event and page | Event name, generic page group, operation, tool context and action; 50 rows; includes export/print requests, product opens/deletes, and backup restores |
| 06. Calculator unique users | `calculation_success` only; **Total users is the sole metric**, not Active users or event count |
| 07. Calculator outcomes and error types | Success/error event counts, page group and error category |
| 08. Validation error share | Doughnut: Event count by event name, restricted to `^calculation_(success|error)$` |
| 09. Product entry (including edits) | Closed funnel: product-entry page view → product entry start → successful product save. Includes edits, retained as the direct-entry/all-saves baseline. |
| 10. First product activation | Closed, indirectly followed: add_product navigation action → create entry start → create label view → create product save. Each condition uses event-scoped fixed enums; edits are excluded. |

The native doughnut's `calculation_error` slice percentage is exactly errors / (successes + errors). These are submission attempts, not distinct people. The expression shown in GA4 uses the unescaped alternation `^calculation_(success|error)$`.

Before interpreting a report, confirm its dates. The main report was saved with **Past 30 days**, showing 2026-10-13 through 2026-11-11 at acceptance. Calculator MAU is Total users with at least one successful calculation over the latest 30 complete property days. Do not substitute raw event counts or assume a saved custom date range moves automatically.

Retention is a daily cohort, first-touch inclusion and any-event return, using the same event segment, with no cross-site/user-scope comparison or breakdown. Select a **31–60 day** range to inspect day 30 as well as day 7. Selecting 90 days was clamped by GA4 to a custom 2026-09-12–2026-11-11 range; shared property retention was deliberately left unchanged. Check/advance these dates when reviewing. Day-30 results cannot exist before cohorts mature.

The configuration was checked after navigating away and reopening saved reports. See [report evidence](evidence/ga-reports-20261112.json). Report availability and event reception do not imply that processed custom dimensions, real acquisition or retention data already exist.

## Event and attribution boundaries

Public application events/parameters are defined in `src/lib/analytics-policy.ts`. The product-first event contract is enumerated in that file; do not infer the current count from the older acceptance table below. Standard Google SDK events such as `first_visit`, `session_start` or `user_engagement` can also exist; they do not represent extra tool actions.

- Start events fire once per **tab session and context**: calculator/planner distinguish `product` versus `standalone`; entry distinguishes `create` versus `update`. These are not GA4 server-defined sessions. A version-2 deduplication key begins fresh counts at the analytics release.
- Saves count successful user actions, not unique products or schedules. Separate `operation=create` from `update` to evaluate first activation. Opening/restoring a saved record does not emit start, generation or save conversions.
- Generic reference location/title are `/library/detail` and `Peptide Tools: library detail`.
- No peptide, search text, dose, concentration, protocol, note, filename or raw error is sent.
- Exports mean file creation and download initiation; print means a print request, not completed saving/printing.
- Allowed UTM sources: google, bing, reddit, newsletter, direct, github, x; mediums: organic, social, email, referral; campaigns: launch, tools, reference.
- External referrers retain origin only; internal referrers are blank. Never put health inputs or personal data in UTM values.
- Consent, blocking and cross-device behavior limit pseudonymous user estimates. GA4 cannot provide per-peptide path analysis; use public Search Console page reports for SEO.

## Actual production acceptance

### Current release — November 13 / PR #9

Actual native Chrome incognito, production Google SDK, no HTML/SDK substitution. New/edit product saves, product and standalone calculations, direct plan save/update before generation, JSON/ICS export, backup restore, product open/delete and English/Chinese switching were exercised. A real one-page print preview displayed three calendar entries and was cancelled. Denied consent and subsequent withdrawal both preserved calculator functionality with zero Google requests.

GA4 Realtime independently showed product_saved=2, operation create=1/update=1, traffic_class qa=2, generic page_location `/products/new` for both. It showed product_entry_start=2 and navigation_action=7, with each action add_product, edit_product, calculate_product, use_calculation, open_schedule, open_workspace and quick_calculator received once. Key events calculation_success=2, protocol_saved=2 and schedule_generated=1 were visible. No public product-created QA event was intentionally generated.

The sanitized HAR contains 25 HTTP 204 collection requests and 27 explicit events, all labelled QA; captured payloads contain no synthetic label/ID or private query/hash. **HAR is incomplete:** navigation-time events absent from it were present in Realtime. Do not infer non-receipt or exact whole-journey counts from HAR alone. See [combined evidence](evidence/production-sdk-trace-20261113-pr9.json), [save operations](evidence/ga-pr9-save-create-update-20261113.png), [QA saves](evidence/ga-pr9-save-qa-20261113.png), [navigation](evidence/ga-pr9-navigation-actions-20261113.png), [withdrawal](evidence/production-withdrawn-20261113-pr9.png) and [saved usage configuration](evidence/ga-product-usage-breakdowns-20261113.png).

The live run did not deliberately trigger product_entry_error and did not verify a fresh DebugView session. Existing automated coverage is separate. Public derived-key-event receipt awaits qualifying traffic; mature 7/30-day cohorts require elapsed time. No physical iPhone acceptance is claimed.

### Earlier release — November 12

Fresh headed Chrome, deployed production code and the real Google SDK, 2026-11-12T13:03:58Z–13:04:26Z. No production HTML, application bundle or SDK replacement. A QA-only facade added documented `debug_mode` to tag commands. Synthetic reference path and fictitious inputs were used; packets were checked before forwarding.

| Event | Exact accepted count |
|---|---:|
| `page_view` | 3 |
| `calculator_start` | 1 |
| `calculation_error` | 2 (required/capacity_exceeded) |
| `calculation_success` | 1 |
| `planner_start` | 1 |
| `schedule_generated` | 1 |
| `protocol_saved` | 1 |
| `export_completed` | 2 (JSON/ICS) |
| `print_requested` | 1 |

All 13 business requests returned 204, all expected counts matched, and all inspected locations/titles/parameters were generic/allowed. Zero Google requests before consent and after withdrawal; no page errors. See [production SDK trace](evidence/production-sdk-trace-20261112.json). Candidate isolation is separately documented in [candidate trace](evidence/candidate-sdk-trace-20261112.json).

Realtime and DebugView subsequently displayed production acceptance events, including the three key events and `print_requested`. DebugView showed 15 total: the 13 business events plus `first_visit` and `session_start`, with `non_personalized_ads = 1`. See [backend evidence](evidence/ga-debugview-20261112.json). These are QA events, excluded from business reports.

The acceptance test intercepted the print API to avoid an OS dialog. It verified API invocation and actual SDK intent emission, **not** a real print dialog, printer or paper output.

## Search Console

- URL-prefix property `https://peptides.ybwdaisy.com/` ownership auto verified through existing parent Domain DNS verification.
- Sitemap `https://peptides.ybwdaisy.com/sitemap.xml`: **Success**, last read 2026-11-12, **22 discovered pages**, 0 videos.
- Calculator and `/library/cjc-1295` initially inspected as **URL is not on Google / URL is unknown to Google**. Calculator Request indexing was attempted, but a final successful receipt was not observed; do not claim it completed.
- Property setup and submission are complete; actual crawling/indexing and search performance await Google. Use this hostname and Search type Web when evaluating the 60-day trial.

Administrative work used authenticated visible UI; no passwords, session cookies or tokens were extracted. No property-wide Search Console link was replaced in the shared GA4 property.
