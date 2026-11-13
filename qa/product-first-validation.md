# Product-first implementation validation

2026-11-13. Branch: `codex/product-first-experience`. Targets the approved mineral-white/graphite/orange visual-v3 and the four product-first workflows. No production merge/release is included in this change.

## Delivered behavior

- `/`: explains the product, shows a clearly marked label example, starts product entry and offers quick calculation; local existing work gets a return entry.
- `/products/new`: name/type first, then own label fields; unknown quantities/concentration can remain unknown; blends keep distinct ingredient names and quantities; confirmations start unchecked and invalidate when relevant facts change.
- `/products`: local register, product detail/edit/delete, matching bounded references, saved-plan entry, versioned backup/restore/clear controls.
- `/calculator#product=…`: verified product context, explicit ingredient basis for blends, derived per-ingredient concentration, all ingredient masses for a successful volume; optional U-100 remains a volume scale. A deliberate action can carry the user's own entered amount into a plan for five minutes, never a recommended amount.
- `/planner#product=…`: product/label snapshot with empty dose, unit, time, repeat and dates. Existing choices are entered by the user. Deep links reopen saved plans, including legacy time-zone aliases; daily agenda and cycle calendar preserve the amount basis.
- English default and `/zh` equivalents; all original calculator/reference/legal routes and existing analytics consent controls retained. App icons use the new accent and preserve their existing mark geometry.

## Evidence

| Check | Result |
|---|---|
| Astro check | 47 files, 0 errors/warnings/hints |
| Unit tests | 28 passed |
| Browser tests | 54 passed: 27 Chrome, 27 mobile WebKit |
| Production static build / links | 50 pages, all local assets/links/metadata checked; 44 sitemap URLs |
| SEO boundary | Public content indexable in a production build; products/entry always noindex; previews noindex; bilingual canonical/hreflang preserved |
| Hallmark render + retention | 0 FAIL / 0 REFLEX; 26/26 links and both test hooks retained; mechanical field differences documented below |
| Independent review | `ship` after code and real browser screenshot review |
| Design QA | [passed](../design-qa.md), including normalized same-width paired images |

The Hallmark retention checker compares fields per route and literal generated IDs. The homepage calculator moved to its existing `/calculator` destination by the approved flow, and planner item IDs are random per visit. Its 12 mechanical field differences and moved headings are explicitly recorded in the CSS stamp, not treated as deleted functionality. Unit and end-to-end tests exercise all retained inputs/handlers. Fifteen long-label heuristic warnings were inspected; shared button nowrap and actual viewport boundaries are the relevant evidence, rather than pretending the static heuristic resolved imported styles.

Screenshot reproduction: `node scripts/capture-review.mjs` against a running local build at port 4321. Uses separate browser contexts for desktop/mobile, declines analytics, and creates QA data only in those isolated contexts. Files are in ignored `qa/screenshots/`; they are not published site assets. The image source is generated educational artwork; exact prompt is retained in `qa/label-example-prompt.txt`.

## Data compatibility and rollback

The existing localStorage key is retained. Valid version 1 plans load without a destructive migration. The first mutation stores a version 2 envelope containing both products and schedules in one atomic setItem. Product edits/deletion preserve existing plan snapshots; a later label revision is explicitly indicated. Failed parsing, validation or writes do not replace existing storage. Restore validates the full file before asking to replace records.

Before reverting a released version, download the version 2 JSON backup. Reverting code to the older pre-product release does **not** make it capable of reading version 2 records. The older app rejects that envelope; do not clear it or hand-edit it to downgrade. Restore this version to read the retained data and its backup. This is a local-data compatibility limit, not a database migration or a claim of lossless rollback.

The PR can be reverted or its preceding Vercel deployment promoted only after release approval. No domain/DNS/account changes are needed for this branch.

## Analytics and limits

Original calculator/schedule/export/print events remain. New allowlisted events: product_entry_start, product_saved, product_opened, product_deleted, backup_restored. Product type is a fixed single/blend enum; identifiers, labels, brands, concentrations, names, amounts and arbitrary errors are excluded. URL fragments keep only local identifiers; analytics manually sends fixed page groups and drops query/hash data. Preview/local collection remains off, and declined consent makes no Google requests. Font and image assets are self-hosted.

Automated event delivery uses an intercepted test tag and inspects the event queue; it is not proof that GA4 received live production events. Production receipt and reporting of new events must be checked after an approved release. Real-device iPhone Safari and a calendar-app import were not performed in this development run; WebKit automation and valid ICS generation do not substitute for those checks.
