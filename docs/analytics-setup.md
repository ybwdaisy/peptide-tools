# Analytics configuration and acceptance

## Identifiers and deployment gates

- Web stream ID supplied by owner: `16326517771`.
- Measurement ID supplied by owner: `G-B34CBGW0EF`.
- Vercel production config: `PUBLIC_GA_MEASUREMENT_ID` (configured).
- Preview and local development do not load GA4, even if consent was granted.
- Production build must have `VERCEL_ENV=production`; no tag is loaded before affirmative consent.
- A second runtime origin gate permits analytics only on `https://peptides.ybwdaisy.com`, never on a default Vercel alias or staging hostname.
- Stream ID is not a property ID. The GA4 property ID and Google account are not yet available to the implementation session.

## Required GA4 admin settings before release

1. Select the property containing stream `16326517771`; confirm its website is `https://peptides.ybwdaisy.com`.
2. Turn off **all Enhanced measurement** for this stream, including form interactions, site search, downloads, outbound clicks, scrolling and automatic history page views. These could bypass the parameter allowlist.
3. Turn off Google Signals, advertising personalization, user-provided data collection, cross-domain measurement and unwanted linked advertising products. The application also disables the relevant tag flags.
4. Choose 2-month event-data retention for the 60-day trial. Do not enable collection of more granular device/location data than needed.
5. Register event-scoped custom dimensions `page_group`, `error_code`, `export_type`.
6. Mark `calculation_success`, `schedule_generated`, `protocol_saved` as key events. Use **once per event** counting for action volume; use **Total users filtered by event** for unique-user metrics. Do not use key-event count as MAU.
7. Configure internal/developer traffic filters without excluding all legitimate users. Automated local/preview tests never send to this stream; a production verification event is a separate, documented exception and must be excluded from demand validation.

## Reports and funnel definitions

| Report | Definition |
|---|---|
| Acquisition | Total users, sessions, source/medium, landing page group; pair with GSC organic clicks |
| Calculator funnel | `page_view` on home/calculator → `calculator_start` → `calculation_success`; open funnel for directly returning users |
| Planner funnel | `page_view` on planner → `planner_start` → `schedule_generated` → `protocol_saved` → `export_completed` (ICS); open funnel because saving can also happen without first generating |
| Retention | GA4 new/returning browser cohorts with 7/30-day return activity; consent-limited pseudonymous coverage |
| Calculator MAU | Total users who triggered `calculation_success` in the trailing 30 days |
| Friction | `calculation_error` / (`calculation_success` + `calculation_error`), breakdown by error_code |

Public event names and allowed values are defined in `src/lib/analytics-policy.ts`. Start events are once per **tab session**, not an exact reconstruction of GA4's server-defined session timeout. Browser restarts, cookies, consent and cross-device behavior can affect user estimates.

## Source attribution

Only these UTM values are retained:

- source: google, bing, reddit, newsletter, direct, github, x
- medium: organic, social, email, referral
- campaign: launch, tools, reference

Never put a peptide, dose, person's name or protocol in UTM values. Internal referrers are blanked. External referrers retain only their origin. Generic detail locations (`/library/detail`) intentionally prevent GA4 per-peptide path analysis; use public Search Console page data for SEO.

## Search Console

1. Add URL-prefix property `https://peptides.ybwdaisy.com/` under the owner's Google account.
2. Prefer inheriting access from an already verified `ybwdaisy.com` Domain property. Otherwise use the Google-provided HTML meta verification value via `PUBLIC_GOOGLE_SITE_VERIFICATION`, or a DNS TXT record supplied by Google.
3. After the owner approves production and the domain resolves, verify ownership, submit `https://peptides.ybwdaisy.com/sitemap.xml`, and inspect the calculator plus a reference URL.
4. Measure only this subdomain, use Search type Web, and report indexing separately from clicks. An accessible sitemap does not prove Google indexing.

## Real production acceptance (pending release/account access)

- Confirm the actual production hostname and property before testing.
- With no stored consent, verify zero requests to Google tag/collection endpoints.
- Consent, run one valid and one invalid calculation, generate/save a user-test schedule, export JSON/ICS, request print.
- In Realtime/DebugView, verify event names and counts. Inspect actual outgoing request URLs/bodies for entered values, concrete reference slugs/titles, query strings and file names.
- On a reference detail, verify generic location/title in all actual Google requests, including automatic first-visit/session events.
- Withdraw consent, verify GA cookies are removed and no further collection requests occur after reload.
- Verify traffic, key events and funnels in processed reports. Tag presence, mocks and local tests do not satisfy this step.

Status: production Measurement ID is configured; property settings, reports, Search Console verification, and live production reception remain unverified.
