# Peptide Tools — focused product labels

Approved direction: the owner released the previous Linear/Apple Notes aesthetic and selected the recommended third visual direction on 2026-11-15. Use the refined focused-label reference, not the old orange/IBM Plex lock: `qa/design-target/product-label-desktop.png`. Product audience: adults in fitness and biohacking managing multiple peptide products they already own. The recognisable object is their own product label, followed by their entered arithmetic and planned schedule.

## Product and preservation

English-first, bilingual browser-local product labels, arithmetic and user-entered schedules. Astro + TypeScript, native HTML controls, static pages, no business backend. Keep all routes, labels used by tests, IDs, field names, data attributes, links and their destinations, forms, event triggers and parameter policy. Do not change storage schemas, restore/clear confirmations, dates, recurrence/time zones, print/export semantics, source facts, privacy text or consent wording. Keep the latest mobile date/time and file-selector fixes.

Existing material constraints remain: the generated vial is a marked educational example, not a supplier or user product photograph. Never infer quantity, identity, concentration, dose, recurrence or combinations from a product name. The example's 5 mg is mass, not concentration. Existing saved data and schemas remain. No actual-use tracking, reminders, inventory, efficacy metrics or clinical verification is introduced.

## Visual system

- Use locally hosted Schibsted Grotesk variable Latin, with native CJK fallback. Near-white cool canvas #f8fafc, navy ink #10283d, slate secondary text #526577, blue action #205b7a. Keep these in shared tokens; no decorative imagery, gradients, shadows or blue panels enclosing every section.
- One restrained, capped top navigation. Make Products, Schedule and Calculator reachable without promotional descriptions; keep existing destinations and analytics action enums. Language control stays visible.
- Titles name the task. Remove slogans and repeated statements of browser-local operation. A first-time empty state may retain one useful instruction and one action.
- Forms lead with their real labels and values. Keep necessary units/confirmation controls and errors visible. Move optional explanations into semantic `details`/`summary` near the relevant form, retaining described-by targets.
- Prefer open aligned facts and tables with thin separators. My products uses a grouped product selector and a focused current record. Desktop selector supports multiple records without crowding; mobile uses a labelled native selection control and a one-column focused detail. Current name, vial amount and concentration are distinct facts, never clinical badges. Calculate volume is the main eligible product action; scheduling and label editing support it. Preserve the calculation-disabled explanation when facts need confirmation.
- Keep a shared stylesheet and tokens; reuse existing page-specific products.css, avoid duplicated layout recipes. Type is 16px body, 30–32px task titles, 24px detail titles and about32px fact values; no giant headings. Use 44px minimum hit targets (48px mobile buttons), immediate visible focus, minmax(0, 1fr) tracks, shrinking field wrappers, and native pickers. Native date/time fixes remain intact.
- Preserve semantic headings, forms, labels, stable IDs, native links and explicit control states. No invisible keyword labels, custom widget framework or new dependency.

## Decisions must improve all three experiences

| Decision | UX | DX | AX |
|---|---|---|---|
| Task names and direct navigation | Find the next action immediately | One shell/navigation recipe | Actual links with stable href/action metadata |
| Remove repeated copy | Less scanning | Fewer duplicated strings and wrappers | Less competing text around controls |
| Native optional-help disclosure | Context remains available on demand | No new state or handlers | Semantic summary, labels and described-by targets |
| Shared neutral surfaces and form layout | Predictable spacing and hierarchy | One set of tokens and rules | Predictable landmarks and controls |
| Preserve domain logic and tests | Existing records/workflows continue | A reviewable presentation diff | Stable action and data contracts |

## File plan

Edit shared Shell.astro, app.css, products.css and tokens.css; home, product entry/detail/workspace, Calculator.astro/calculator page and planner presentation; existing product render function only to implement selection and fact layout. Add bilingual strings to the existing Chinese dictionary where required. Shared styling covers library/legal pages with their content unchanged. Add local font, review/evidence documents. Delete no file, route or component tree. Do not change existing tests to conceal regressions.

## Acceptance

Capture before/after at phone and desktop sizes, sweep Hallmark in app scope against the kept record, inspect real screenshots, run existing checks/build/unit/browser suites, independently review before opening a PR. Preview and new PR first; merge/production release only after owner approval. Never label static checks or desktop viewport emulation as physical iPhone acceptance.

## Approved functional extension — 2026-11-15

The owner approved round one: known-concentration / label-and-final-volume inputs, saved reusable calculations, backup-request state and restore preview. This explicitly extends the prior schema-preservation boundary for those features only. Keep native controls; use shared arithmetic/input and backup components, no new dependency or business backend. Read versions 1/2 and use version 3 when final-volume source records or saved calculations require it. Preserve earlier data and snapshots; never infer verification, recommend inputs or auto-calculate restored setups. A changed linked product requires review. New analytics uses fixed enums and retains consent/origin gating. Round two's daily actual-use records remain a separate design review.
