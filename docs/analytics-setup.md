# Analytics configuration and acceptance

## Current account and collection status

- Account `ybwdaisy`: `359267445`; shared property `ybwdaisy`: `494048879`.
- Existing main-site stream `主站`, URL `https://ybwdaisy.com`, stream `16326517771`, Measurement ID `G-B34CBGW0EF`.
- The owner explicitly selected reuse of this stream with site-level hostname filtering. Do not change its URL/name to the peptide site or create a replacement property without a new decision.
- PolicyPilot has a separate stream in the same property. Its existing events, comparisons and exploration must be preserved.
- **Collection is currently paused only for Peptide Tools.** Its production `PUBLIC_GA_MEASUREMENT_ID` was removed and the site redeployed after real Google SDK testing exposed extra automatic events and a concrete library path/title. Do not restore the ID until actual network privacy/count verification passes.
- Preview/local builds and Vercel aliases are excluded by environment and exact-origin gates. Visitor consent is required before tag loading. With the current paused build, even an affirmative analytics choice sends zero Google requests.

## Saved GA4 configuration

1. Event-scoped custom dimensions: `Peptides page group` → `page_group`, `Peptides error category` → `error_code`, `Peptides export type` → `export_type`.
2. Key events: `calculation_success`, `schedule_generated`, `protocol_saved`; once per event, no default monetary value. Existing five key events were retained.
3. Saved comparison `Peptides — peptides.ybwdaisy.com`: hostname **contains** `peptides.ybwdaisy.com`. Standard comparison exact-match values currently omit the new hostname; refine to exact match when processed data makes it available. Each new Tools exploration tab uses an **exact** hostname filter independently.
4. Tools exploration: calculator and planner funnels plus acquisition/usage tables are being saved. Backend persistence and remaining tabs are tracked below; setup alone is not data acceptance.

## Shared-setting approval and remaining work

The owner subsequently explicitly authorized disabling Enhanced measurement on the reused main-site stream. The switch and confirmation were completed and checked as off; PolicyPilot's separate stream was not changed. Initial approval review had rejected the shared change, and it was not retried until this explicit permission arrived.

A follow-up diagnostic still showed an automatic specific reference page view, so the application now applies global privacy defaults **before** the Google tag initializes, as well as per-stream and per-event defaults. A safe candidate test on synthetic `/library/detail` with the real SDK produced one generic page view, with no unsafe packet sent. Full live acceptance and restoration of the production Measurement ID remain pending.

Property-wide Signals, advertising links, retention and traffic filters were not changed because this property also serves PolicyPilot. The app supplies no-ad/Signals flags; confirm the real tag honors them. Do not represent those client flags as proof of property-wide administrative settings.

After privacy correction, confirm all event names, exact counts, export/print actions and withdrawal with the real SDK. Enable documented debug mode in the configuration/event commands for a QA browser without reordering dataLayer commands. Check Realtime and DebugView as well as processed reports. Configure QA exclusion without disrupting legitimate main-site/PolicyPilot traffic.

## Reports and funnel definitions

| Report | Definition |
|---|---|
| Acquisition | Total users, sessions, source/medium, landing page group; pair with GSC organic clicks |
| Calculator funnel | `page_view` on home/calculator → `calculator_start` → `calculation_success`; open funnel for directly returning users |
| Planner funnel | `page_view` on planner → `planner_start` → `schedule_generated` → `protocol_saved` → `export_completed` (ICS or JSON); open funnel because saving can also happen without first generating |
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

- URL-prefix resource `https://peptides.ybwdaisy.com/` was added and ownership **auto verified** through the existing parent Domain property's DNS verification.
- Submitted `https://peptides.ybwdaisy.com/sitemap.xml`; Google reports **Success**, last read 2026-11-12, **22 discovered pages**, 0 videos.
- Calculator inspection: **URL is not on Google / URL is unknown to Google** at initial release. An indexing request was initiated; its final result and a reference-page inspection still need recording.
- Performance/indexing reports initially say processing data; availability of the sitemap is not proof of indexing. Measure only this hostname, Search type Web.

The native controls required an unlocked Mac and a real mouse event. Ownership and submission were confirmed in Google's UI, not inferred from public robots/sitemap checks. No password, cookie or token extraction was used.

## Actual collection evidence and completion gate

Real production QA ran at 2026-11-12T11:19:13Z–11:19:32Z with fictitious inputs. Google collection endpoints returned 204 for manual events, but extra automatic page views/form start were also observed, including a specific library slug/title. Attempted QA debug flags did not appear in outgoing events; DebugView showed no debug device. A later Realtime view contained no available data, so backend reception is not confirmed. Treat these QA events as test traffic, never acquisition evidence.

After the hold deployment, a fresh browser check at 2026-11-12T11:23:13Z confirmed production analytics disabled, zero Google requests even after affirmative consent, and a successful calculator result.

Before marking instrumentation complete, verify:

- zero Google requests before consent and after denial/withdrawal;
- only the nine approved application event names, plus any explicitly accepted SDK-required automatic events, with no duplicate page views;
- generic reference location/title in **every** actual Google request, never entered values, concrete slugs/titles, arbitrary queries or filenames;
- success/error, schedule/save, JSON/ICS and print event counts from deliberate UI actions;
- Realtime, DebugView, key events and processed reports for this hostname;
- 7/30-day returns and trailing-30-day unique successful calculator users, excluding QA;
- Search Console property verification, sitemap submission and actual indexing status.

**Current status: website released; Search Console ownership and sitemap complete; page indexing and GA4 live acceptance remain incomplete; Peptide Tools collection paused.**
