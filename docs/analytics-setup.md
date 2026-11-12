# Analytics configuration and acceptance

Updated: 2026-11-12. **Production collection and live backend acceptance passed.** Business reports are saved; a newly launched site has no established acquisition or retention results yet.

## Account and privacy settings

- Account `ybwdaisy` (`359267445`), shared property `494048879`.
- Owner-selected existing main-site stream `主站`, URL `https://ybwdaisy.com`, stream `16326517771`, Measurement ID `G-B34CBGW0EF`.
- Filter Peptide Tools by exact hostname `peptides.ybwdaisy.com`. Do not rename the shared stream or treat its unfiltered totals as this site's results.
- The owner explicitly authorized turning off Enhanced measurement on this shared stream; the off state was verified. PolicyPilot's separate stream and existing reports/key events were preserved.
- Property-wide Signals, advertising links, retention and traffic filters were not changed. The application supplies Google Signals/ad-personalization disabling flags and denied advertising consent; this does not imply those property-wide administrative settings were changed.
- Production ID is active again. Preview/local and Vercel aliases cannot collect because both production configuration and exact runtime origin are required. The Google tag loads only after affirmative analytics consent.

A real-SDK check exposed automatic specific-reference page views despite per-stream defaults. PR #2 fixed this by setting generic page metadata and privacy defaults globally **before SDK initialization**, alongside per-stream/per-event controls. Candidate privacy/count checks passed before production collection resumed; final production checks also passed.

## Saved backend configuration

Event-scoped dimensions:

| Display name | Parameter |
|---|---|
| Peptides page group | `page_group` |
| Peptides error category | `error_code` |
| Peptides export type | `export_type` |

`calculation_success`, `schedule_generated` and `protocol_saved` are key events, once per event, with no default monetary value. Existing key events were retained.

The saved standard comparison `Peptides — peptides.ybwdaisy.com` uses hostname **contains** the full hostname. It is a raw site comparison and includes launch QA. Use the stricter business explorations below when evaluating demand.

Every business tab and the retention report use the event-scoped segment **Peptides events (exclude launch QA day)**:

```
Hostname exactly matches peptides.ybwdaisy.com
AND Date is not 20261112
```

The definition was reopened and verified. This conservatively excludes the entire launch QA day; earlier and later launch tests are not customer evidence. Future acceptance traffic also needs explicit exclusion. Event scope prevents a visitor's activity on another site in the shared property from being counted as peptide-site activity.

## Open the reports

- [Acquisition and tools — 30-day analysis](https://analytics.google.com/analytics/web/#/analysis/a359267445p494048879/edit/EqjrhzZYSeeMpPBtKqUmQA)
- [7/30-day retention — set dates](https://analytics.google.com/analytics/web/#/analysis/a359267445p494048879/edit/ZJ3t4DjYRJ-D1kuSPxXHZg)

The main analysis has seven tabs, in this order:

| Tab | Definition |
|---|---|
| 1. Calculator conversion | Open funnel: home/calculator page view → calculator start → successful calculation |
| 2. Planner conversion | Open funnel: planner page view → start → generate schedule → save → export JSON/ICS |
| 3. Acquisition by channel | Session default channel group, total users and sessions |
| 4. Usage by event and page | Event name and generic page group; use page views for generic page traffic |
| 5. Calculator unique users | `calculation_success` only; **Total users is the sole metric**, not Active users or event count |
| 6. Calculator outcomes and error types | Success/error event counts, page group and error category |
| 7. Validation error share | Doughnut: Event count by event name, restricted to `^calculation_(success|error)$` |

The native doughnut's `calculation_error` slice percentage is exactly errors / (successes + errors). These are submission attempts, not distinct people. The expression shown in GA4 uses the unescaped alternation `^calculation_(success|error)$`.

Before interpreting a report, confirm its dates. The main report was saved with **Past 30 days**, showing 2026-10-13 through 2026-11-11 at acceptance. Calculator MAU is Total users with at least one successful calculation over the latest 30 complete property days. Do not substitute raw event counts or assume a saved custom date range moves automatically.

Retention is a daily cohort, first-touch inclusion and any-event return, using the same event segment, with no cross-site/user-scope comparison or breakdown. Select a **31–60 day** range to inspect day 30 as well as day 7. Selecting 90 days was clamped by GA4 to a custom 2026-09-12–2026-11-11 range; shared property retention was deliberately left unchanged. Check/advance these dates when reviewing. Day-30 results cannot exist before cohorts mature.

The configuration was checked after navigating away and reopening saved reports. See [report evidence](evidence/ga-reports-20261112.json). Report availability and event reception do not imply that processed custom dimensions, real acquisition or retention data already exist.

## Event and attribution boundaries

Public application events/parameters are defined in `src/lib/analytics-policy.ts`. There are nine application event types. Standard Google SDK events such as `first_visit`, `session_start` or `user_engagement` can also exist; they do not represent extra tool actions.

- Start events fire once per **tab session**, which is not identical to GA4's server-defined session timeout.
- Generic reference location/title are `/library/detail` and `Peptide Tools: library detail`.
- No peptide, search text, dose, concentration, protocol, note, filename or raw error is sent.
- Exports mean file creation and download initiation; print means a print request, not completed saving/printing.
- Allowed UTM sources: google, bing, reddit, newsletter, direct, github, x; mediums: organic, social, email, referral; campaigns: launch, tools, reference.
- External referrers retain origin only; internal referrers are blank. Never put health inputs or personal data in UTM values.
- Consent, blocking and cross-device behavior limit pseudonymous user estimates. GA4 cannot provide per-peptide path analysis; use public Search Console page reports for SEO.

## Actual production acceptance

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
