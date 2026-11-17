# Product-first analytics — November 13, 2026

Current daily workflow extension (November 17, 2026): `/today`, returning-user navigation, `record_saved`, `record_removed` and CSV export are specified in [daily workflow release](daily-workflow-2026-11-17.md#analytics). The previous product/calculation funnel events remain unchanged. Historical reception evidence below does not establish reception of the new daily events.

The website now begins with a product label and a browser-local workspace. The analytics release follows that journey while retaining the existing shared GA4 property, stream and privacy policy. PR #8 introduced the contract; PR #9 is merged and deployed as `d93ee74`, deployment `dpl_3hvo7oH8ZeNLgmCvWZq6MTXY2j1Z`. Native Chrome acceptance now independently confirms navigation events and one create/one update save in GA4 Realtime. Preserved Network HAR omitted some events that GA4 received; an absent HAR row alone cannot establish event loss. See the [current acceptance record](evidence/production-sdk-trace-20261113-pr9.json).

## Fixed event contract

All event names and parameters pass the central allowlist. No product names, brands, ingredients, IDs, hashes, entered dose/concentration, dates/times, schedule names, notes, search terms or raw errors are sent. English/Chinese share anonymous page groups. `product_type` is only `single|blend`.

| Event | Actual trigger and accepted parameters |
|---|---|
| `navigation_action` | Explicit enabled control click; `action` is one of `add_product`, `view_label_example`, `quick_calculator`, `open_workspace`, `plan_product`, `calculate_product`, `edit_product`, `open_schedule`, `open_planner`, `use_calculation`. Page group supplies source context; no clicked text or destination URL. |
| `product_entry_start` | First explicit entry interaction per tab session and `operation=create|update`. Form restoration is silent. |
| `product_label_view` | First successful **Continue to label** action on that page. Restored label steps are silent; edits may open directly on the label step, so this is a new-entry diagnostic, not a required editing funnel step. |
| `product_entry_error` | Failed native/JavaScript validation or attempted persistence; fixed `error_code=invalid_label|storage_unavailable|unreadable_data`, plus operation. No error text or field values. Disabled actions do not claim an attempt. |
| `product_saved` | Successful explicit local write; product type and operation. New record = create, existing record = update. |
| `product_opened`, `product_deleted` | Actual explicit open, or successful confirmed deletion; product type only. Rendering a detail after saving does not fabricate an open. |
| `calculator_start`, `calculation_success`, `calculation_error` | Existing explicit input/submit behavior, now with `tool_context=product|standalone`. Error code retains the original three-value allowlist. |
| `planner_start`, `schedule_generated` | Existing explicit editing/generation behavior, now with tool context. Opening an old schedule is silent for these conversions. |
| `protocol_saved` | Successful explicit local write, with operation and tool context. **Saving directly without a Generate click is valid.** |
| `export_completed`, `print_requested`, `backup_restored` | Existing successful actions. Export type is `ics|json`. Download/print initiation is not evidence of saving/printing a file. Restoration does not fabricate save conversions. |

All events include sanitized fixed page metadata and attribution. Normal visits send `traffic_class=public`. Explicit QA tab sessions send `traffic_class=qa`, `page_group=qa`, `debug_mode=true`. QA page location/title still use sanitized fixed metadata. The marker survives navigation via sessionStorage; when storage is unavailable only the current page is marked, so repeat `?analytics_test=1` on each test page. Use a fresh tab session for each acceptance and never infer ordinary browsing to be QA. Consent and exact production-origin gating still apply, including QA visits.

## GA4 configuration

Property `494048879`, stream `16326517771`, Measurement ID `G-B34CBGW0EF`. Every peptide business report must restrict **events**, not merely users, to exact hostname `peptides.ybwdaisy.com`. Shared property filters, advertising, retention and other sites are unchanged.

Four new event-scoped definitions were created: Peptides action (`action`), Peptides operation (`operation`), Peptides tool context (`tool_context`), Peptides traffic class (`traffic_class`). Existing page group/error/export definitions were preserved. The four definitions were imported into the main analysis. The saved new-product funnel uses event-scoped dimension conditions (AND) for action and operation; the raw event-parameter picker did not list these new parameters, so registered dimension conditions were used instead.

[Main report: 产品录入、换算、计划与获客](https://analytics.google.com/analytics/web/#/analysis/a359267445p494048879/edit/EqjrhzZYSeeMpPBtKqUmQA)

Saved changes:

- Calculator visit denominator is calculator page views, with home removed.
- Plan generation and local saving are separate funnels. Saving does not require prior generation or export.
- Product entry → entry start → product saved is a new closed funnel, explicitly labelled **including edits**.
- Tab 10, **首次添加·入口到产品保存**, is a separate closed funnel: navigation_action AND action=add_product → product_entry_start AND operation=create → product_label_view AND operation=create → product_saved AND operation=create. Each transition is indirect. Hostname/QA isolation is inherited. Its four steps and all three create conditions were reopened and verified; see [captured settings](evidence/ga-first-product-funnel-20261113.txt) and [screenshot](evidence/ga-product-activation-20261113.png).
- Main-report event segment excludes launch date 20261112 and events whose existing page-group dimension equals `qa`. This supports new QA exclusion without waiting for a new dimension.
- Retention now has the same event-scoped QA exclusion, preserving daily first touch / any-event return semantics and its explicit set-date behavior.
- `peptides_product_created` is a new key event derived in the main stream only when event_name equals product_saved, page_location exactly equals https://peptides.ybwdaisy.com/products/new, operation equals create, and traffic_class equals public. Source parameters are copied; counting is once per event, with no default monetary value. QA and edits do not qualify. The saved rule and enabled key-event state were observed.
- Acquisition, event usage, successful-calculation Total users and errors are preserved.
- The usage tab now has five row dimensions: event name, page group, operation, tool context and action, with 50 visible rows. Existing metrics and exact-hostname/QA isolation remain. The saved configuration survived switching tabs and reloading the analysis; see [usage configuration](evidence/ga-product-usage-breakdowns-20261113.png).

## Remaining release and backend acceptance

- PR #9 is merged and deployed with approval. Its production commit and live navigation/save reception are verified. Preview/local/aliases remain gated against production collection.
- The four new dimensions and the first-entry funnel are saved and verified. Keep the direct-entry/including-edits report separately so direct links and editing are not misclassified as landing-page losses.
- Optional deeper product-route analyses can use alternative paths: `navigation_action action=calculate_product` → `calculator_start tool_context=product` → `calculation_success tool_context=product`; and `navigation_action action=plan_product|use_calculation` → `planner_start tool_context=product` → `protocol_saved tool_context=product`. Do not force calculation, generation or export onto every user's route.
- Operation/context/action are included in the saved usage table. Keep exports/printing as optional follow-up actions and show error categories independently.
- The scoped product-create key event is configured. Actual public receipt remains unobserved; QA must not trigger it. Existing key events were preserved.
- Retention QA exclusion is saved; continue checking/advancing its explicit dates. Day 7/30 needs matured cohorts. Calculator MAU remains **Total users** with calculation_success in the latest 30 complete property days.
- A fresh native Chrome incognito session exercised new/edit, product/standalone calculation, direct plan save/update, generation, JSON/ICS export, restore, product open/delete and Chinese navigation. Actual print preview opened and was cancelled. After withdrawal the calculator worked with zero Google traffic. Realtime verified product_saved create=1/update=1, both QA and both with generic source URL; seven navigation actions each arrived once. The HAR has 25 HTTP 204 collection requests/27 explicit events, all QA, and no synthetic labels/IDs in captured request payloads. It omits navigation-time events that Realtime received, so do not present it as a complete event log.
- `product_entry_error` was not deliberately triggered in this live run; its existing automated coverage is separate. Public derived-key-event receipt and mature retention data are not fabricated for acceptance. Current live evidence uses Realtime; it does not claim a fresh DebugView acceptance. Test activity is not demand evidence.

## Verification and rollback

Astro check, 29 unit tests, static verification of 50 pages/44 sitemap URLs and 62 Chrome/WebKit E2E tests passed. After adding immediate QA page grouping, all 34 relevant analytics/tool checks passed again. These are local automated desktop Chrome and iPhone-sized WebKit checks, not physical iPhone acceptance or GA4 reception.

Revert this analytics PR through another PR to restore the prior contract; do not clear product/workspace storage. The backend's more accurate calculator/save funnels work with the prior events as well. Before rollback acceptance, use a launch-day exclusion or update the QA exclusion, because old code does not label QA visits. Never enable shared automatic enhanced measurement to compensate for missing custom events.

## Navigation-delivery correction

[Initial real-SDK evidence](evidence/production-sdk-trace-20261113-incomplete.json) contains 21 accepted HTTP 204 collection requests / 22 explicit events. All captured events had QA markers and fixed page paths; synthetic product labels/IDs were absent. Product saves and navigation intent events were absent from that HAR and acceptance was left incomplete. The later PR #9 run demonstrates that HAR alone can omit navigation-time events received by GA4, so the initial artifact does not independently prove those events were never received. Local dataLayer-only checks also did not model document teardown.

PR #9 (https://github.com/ybwdaisy/peptide-tools/pull/9) was merged with approval and deployed as `d93ee74`. Final CI passed, including 64 Chrome/WebKit E2E checks. The follow-up waits for Google's documented `event_callback` before same-tab navigation, with a maximum 1,000 ms fallback so blocked analytics cannot strand a user. Capture-phase intent handling precedes ordinary link navigation while preserving modifier/new-tab behavior, local calculator draft handlers and native hash-example scrolling. The destination/hash stays in a local callback, outside analytics parameters. A successful product save disables repeated submission while navigation is pending. No event queue, identifiers or health data are persisted for delivery.

A browser test delays SDK processing and performs actual intercepted collector requests. It verifies both product-save operations and both entry starts arrive before document teardown, source metadata stays sanitized, and duplicate SDK callbacks cannot duplicate a save/navigation. Separate no-callback stub tests cover the timeout path. These are simulated SDK checks. The subsequent native real-SDK acceptance and independent Realtime observations are recorded separately above.

Google's control-parameter reference: https://developers.google.com/tag-platform/gtagjs/reference/parameters . A callback indicates SDK processing, not guaranteed long-term report storage.

## Round-one calculation workflow — pending preview review, November 15, 2026

- `calculation_success` and `calculation_error` additionally accept `input_mode=known|label`. Product-linked calculations use the confirmed product concentration and report `known`.
- `calculation_saved` fires only after a successful explicit local write, with `operation=create|update`, `tool_context=standalone|product` and `input_mode=known|label`. Repeat writes to the same record do not create duplicate records, but distinct deliberate save actions remain events.
- `calculation_reused` fires on an unmodified same-tab saved-setup link click, with tool context and input mode. It uses the existing bounded SDK-callback navigation helper, including same-URL reopening. Refresh, initialization and language restoration do not fabricate reuse or calculation-success events.
- No calculation name, product reference, hash, user values, final volume, confirmation state, backup timestamp or digest enters these parameters. Existing origin, consent, QA and hostname boundaries remain. Backup restore is counted only after preview, confirmation and a successful write.

The new input-mode custom dimension, optional save/reuse exploration and actual production reception are **not yet configured or accepted**. Local simulated-tag tests verify one save and one explicit reuse with sanitized events, including same-page navigation; they do not prove GA4 delivery. After approved release, use marked QA traffic, Realtime/DebugView and the exact hostname filter before marking the production instrumentation complete. The existing funnels remain meaningful and unchanged until that review.

Per-mode validation failure rate uses error events / (error + success events), i.e. submitted attempts. The tab-session calculator_start denominator is not a per-mode attempt count and must not be relabelled as one.
