# Focused label UI validation

Branch `codex/product-label-ui`, based on merged main82408c9. Original checkout and its untracked research report are untouched. Local preview: http://127.0.0.1:4333/products . All runtime evidence uses isolated synthetic labels; no real user records or production analytics.

## Change and preservation

- Shared local Schibsted Grotesk, cool-white/slate-blue tokens and open working surfaces.
- Desktop grouped product selector; phone native selector; focused label facts, explicit concentration confirmation and primary volume conversion.
- Entry separates vial label facts from solution concentration. Calculator separates inputs/result. Planner groups setup, items, committed actions and generated planned entries.
- Home shows the existing explicitly marked educational label example near the entry action. Library/legal routes inherit shared tokens with facts unchanged.
- All existing hooks/routes, consent rules, source/legal facts, domain arithmetic, storage v1/v2/v3 compatibility and delete/restore confirmations preserved. No new dependency, business backend or medical/dose recommendation.

## Verification

- Astro check:59 files,0 errors/warnings/hints (before final documentation).
- Unit:35 passed.
- Static build:50 pages; local assets/links/metadata and44 sitemap URLs verified.
- Full existing+selection E2E:88 passed on static build,29.9s. Added selection-event contract checks:6-test selector suite passed (4 overlap previous suite;2 additional). CI runs all90.
- Chrome screenshot script:36 EN/ZH route/viewport cases at1440×1024,390×844,320×844; no document overflow, page errors, storage-envelope mutation or denied-analytics requests. Font load verified in the final capture run. Includes user-generated plan agenda captures.
- Hallmark: before/after screenshots and `.hallmark/compare.html`;0 Floor failures/0 open Reflex.39/39 links,37/49 rendered fields match,12 generated UUID fields recorded as equivalent by preserved data hooks,11/11 test hooks,21/21 headings. Development `/_image` changes to the original asset's compiled static webp, explicitly recorded.
- Independent finish review:ship,0 actionable findings; screenshot/source inspection, not a separate browser session.

Initial development-server runs were discarded: toolbar intercepted taps and module timing differed. A second attempt targeted an unavailable port because Astro interpreted duplicated port flags; discarded as environment failure. Final static build's actual working directory/listener were verified, and complete regression passed. The screenshot harness also corrected `/zh/` to the canonical `/zh` and now asserts HTTP200 plus the main landmark before accepting a capture. No existing test expectation was weakened.

## Local reproduction

```sh
npm ci
npm run build
node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4333
npm run test:e2e -- --config qa/focused-ui.config.ts
node scripts/capture-focused-ui.mjs
npm run verify:site
```

Use spaced CLI flags: `--host 127.0.0.1 --port 4333`. Stop an existing Astro preview for this project before changing its port; Astro7 uses a per-project preview daemon.

## Rollback and limits

Preview/PR only. Production merge awaits the owner's release instruction under the existing review agreement. Revert this UI commit to restore the preceding presentation. No storage migration is introduced; retain any existing v3 backup when comparing older application versions. Physical iPhone Safari and production analytics reception are not asserted by these local checks. Existing icons remain unchanged by this UI rewrite.
