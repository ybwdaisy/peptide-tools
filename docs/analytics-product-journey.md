# Product-first analytics — November 13, 2026

The website now begins with a product label and a browser-local workspace. The analytics release follows that journey while retaining the existing shared GA4 property, stream and privacy policy. PR #8 was merged and deployed as `caf8cd5`, deployment `dpl_5FaPQmj21FXbE8xp7zUyADrksAW2`. The real-SDK acceptance found navigation-time event loss, so acceptance remains incomplete. The follow-up `codex/analytics-navigation-delivery` branch fixes this before a new production acceptance.

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

## Remaining release and backend acceptance

- PR #8 is already merged/deployed. Approve the navigation-delivery fix and verify its production commit before repeating acceptance. Preview/local/aliases must not collect production analytics.
- The four new dimensions and the first-entry funnel are saved and verified. Keep the direct-entry/including-edits report separately so direct links and editing are not misclassified as landing-page losses.
- Optional deeper product-route analyses can use alternative paths: `navigation_action action=calculate_product` → `calculator_start tool_context=product` → `calculation_success tool_context=product`; and `navigation_action action=plan_product|use_calculation` → `planner_start tool_context=product` → `protocol_saved tool_context=product`. Do not force calculation, generation or export onto every user's route.
- Operation/context/action are imported for drill-down; future usage tables can add them as needed. Keep exports/printing as optional follow-up actions and show error categories independently.
- The scoped product-create key event is configured. Actual public receipt remains unobserved; QA must not trigger it. Existing key events were preserved.
- Retention QA exclusion is saved; continue checking/advancing its explicit dates. Day 7/30 needs matured cohorts. Calculator MAU remains **Total users** with calculation_success in the latest 30 complete property days.
- On the actual production site start a fresh QA tab with `?analytics_test=1`, consent, and use fictitious labels. Exercise new/edit, product/standalone calculation, direct plan save/update, export, restore and Chinese navigation. Check real tag packets, Realtime/DebugView and exact event counts; repeat after declining consent and confirm zero Google traffic. Test data is not demand evidence.
- Reopen saved reports/settings and record visible configuration and actual receipt. Local SDK stubs verify the contract only. **New production analytics is not complete until this live acceptance passes.**

## Verification and rollback

Astro check, 29 unit tests, static verification of 50 pages/44 sitemap URLs and 62 Chrome/WebKit E2E tests passed. After adding immediate QA page grouping, all 34 relevant analytics/tool checks passed again. These are local automated desktop Chrome and iPhone-sized WebKit checks, not physical iPhone acceptance or GA4 reception.

Revert this analytics PR through another PR to restore the prior contract; do not clear product/workspace storage. The backend's more accurate calculator/save funnels work with the prior events as well. Before rollback acceptance, use a launch-day exclusion or update the QA exclusion, because old code does not label QA visits. Never enable shared automatic enhanced measurement to compensate for missing custom events.

## Navigation-delivery correction

[Initial real-SDK evidence](evidence/production-sdk-trace-20261113-incomplete.json) contains 21 accepted HTTP 204 collection requests / 22 explicit events. All captured events had QA markers and fixed page paths; synthetic product labels/IDs were absent. However, both product-save actions and navigation intent events were absent, so this run failed acceptance. Local dataLayer-only checks had not modeled document teardown.

PR #9 (https://github.com/ybwdaisy/peptide-tools/pull/9) is awaiting merge approval. Its source CI, including the complete Chrome/WebKit suite, passed before the additional backend evidence documentation was added. The follow-up waits for Google's documented `event_callback` before same-tab navigation, with a maximum 1,000 ms fallback so blocked analytics cannot strand a user. Capture-phase intent handling precedes ordinary link navigation while preserving modifier/new-tab behavior, local calculator draft handlers and native hash-example scrolling. The destination/hash stays in a local callback, outside analytics parameters. A successful product save disables repeated submission while navigation is pending. No event queue, identifiers or health data are persisted for delivery.

A browser test now delays SDK processing and performs actual intercepted collector requests. It verifies both product-save operations and both entry starts arrive before document teardown, source metadata stays sanitized, and duplicate SDK callbacks cannot duplicate a save/navigation. Separate no-callback stub tests cover the timeout path. This is still a simulated SDK test; real production collection must be repeated after release.

Google's control-parameter reference: https://developers.google.com/tag-platform/gtagjs/reference/parameters . A callback indicates SDK processing, not guaranteed long-term report storage.
