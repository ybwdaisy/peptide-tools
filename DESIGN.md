# Peptide Tools — task-first, quiet interface

Approved direction: the owner's 2026-11-15 request for the clarity of Linear and Apple Notes, with simple goals, architecture, design and implementation. These are references for restraint, not copied brands.

## Product and preservation

English-first, bilingual browser-local product labels, arithmetic and user-entered schedules. Astro + TypeScript, native HTML controls, static pages, no business backend. Keep all routes, labels used by tests, IDs, field names, data attributes, links and their destinations, forms, event triggers and parameter policy. Do not change storage schemas, restore/clear confirmations, dates, recurrence/time zones, print/export semantics, source facts, privacy text or consent wording. Keep the latest mobile date/time and file-selector fixes.

Existing material constraints remain: the generated vial is a marked educational example, not a supplier or user product photograph. Never infer quantity, identity, concentration, dose, recurrence or combinations from a product name. The example's 5 mg is mass, not concentration. This request supersedes the prior mineral-gray ground and promotional home composition; IBM Plex Sans and the orange action color remain.

## Visual system

- Keep local IBM Plex Sans and the small orange primary-action accent. Use a near-white main canvas and quiet neutral secondary surfaces; no decorative imagery or gradients.
- One restrained, capped top navigation. Make Products, Schedule and Calculator reachable without promotional descriptions; keep existing destinations and analytics action enums. Language control stays visible.
- Titles name the task. Remove slogans and repeated statements of browser-local operation. A first-time empty state may retain one useful instruction and one action.
- Forms lead with their real labels and values. Keep necessary units/confirmation controls and errors visible. Move optional explanations into semantic `details`/`summary` near the relevant form, retaining described-by targets.
- Prefer lists, facts and tables with thin separators. No nested cards or redundant status tags. Current input values and generated calendar are the main visual objects.
- Keep a single shared stylesheet and tokens; avoid page-specific copies of layout recipes. Use 44px minimum hit targets (48px mobile buttons), immediate visible focus, minmax(0, 1fr) tracks, shrinking field wrappers, and native pickers.
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

Edit shared Shell.astro, app.css, products.css and tokens.css; home, product entry/detail/workspace, calculator, planner and reference presentation; existing render functions only if removing redundant presentational text. Add bilingual strings to the existing Chinese dictionary where genuinely required. Add review/evidence documents. Delete no file, route or component tree. Do not change tests to conceal regressions.

## Acceptance

Capture before/after at phone and desktop sizes, sweep Hallmark in app scope against the kept record, inspect real screenshots, run existing checks/build/unit/browser suites, independently review before opening a PR. Preview and new PR first; merge/production release only after owner approval. Never label static checks or desktop viewport emulation as physical iPhone acceptance.

## Approved functional extension — 2026-11-15

The owner approved round one: known-concentration / label-and-final-volume inputs, saved reusable calculations, backup-request state and restore preview. This explicitly extends the prior schema-preservation boundary for those features only. Keep the quiet app design and native controls; use shared arithmetic/input and backup components, no new dependency or business backend. Read versions 1/2 and use version 3 when final-volume source records or saved calculations require it. Preserve earlier data and snapshots; never infer verification, recommend inputs or auto-calculate restored setups. A changed linked product requires review. New analytics uses fixed enums and retains consent/origin gating. Round two's daily actual-use records remain a separate design review.
