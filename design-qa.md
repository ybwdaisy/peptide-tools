# Product-first visual QA

Date: 2026-11-13. Scope: an existing Astro website, mobile-first product management; approved visual-v3, not a native app or a new starter.

## Visual truth and browser evidence

- Source: `../peptide-tools-review/visual-v3/01-home-reviewed.png` and `02-my-products-reviewed.png` (887 × 1774 px each).
- Implementation: `qa/screenshots/product-home-phone-full.png` (780 × 3218 px) and `my-products-phone-full.png` (780 × 2426 px), plus the corresponding desktop captures. Mobile viewport: 390 × 780 CSS px, device scale 2. Full captures include below-the-fold retained reference links, data controls and legal footer.
- Combined comparisons: `qa/screenshots/comparison-home.png`, `comparison-products.png`. Each puts source and implementation in the **same image** at 390 CSS px width, including a 780 px viewport crop and full scroll content. Source density normalization is 887 → 390 CSS px; implementation density is 780 → 390 CSS px. Images are displayed proportionally in a browser comparison page, not stretched or raster-painted.
- State: English default, optional analytics declined, homepage first use; products comparison contains two label examples and one saved plan. Screenshot data is synthetic QA input. BPC label identity is intentionally unconfirmed in the actual saved record; the source emphasized only missing concentration. This is a state difference, not evidence of exact pixel matching.
- Focused-region evidence is the first-viewport crop in each combined comparison. Separate micro-crops were unnecessary because the issue was overall vertical density.

## Comparison history

1. **P2: mobile header and product list pushed the return action below the useful viewport.** Removed empty page-level error spacing, tightened mobile header/list spacing, placed Add another product after My schedules, compacted the plan summary and collapsed local-data controls behind a native disclosure. Backups/restore/clear remain operable and covered by browser tests. Final product capture shows Open my schedule inside the 390 × 780 viewport for this two-product example.
2. **P2: homepage example was too low and tall.** Tightened introductory gaps, kept the form as a readable subtitle and displayed quantity/concentration as the two label rows. Final homepage viewport contains the vial, label quantities, unknown concentration and explanatory note. Earlier evidence remains in `comparison-*-before.png`; final paired images were regenerated and inspected after fixes.
3. Independent review identified a valid legacy time-zone alias lost by the planner deep link. All loading paths now add a missing valid time-zone option. It also identified an ambiguous blend basis in the month calendar; agenda, table, month entries and ICS summary now retain the selected basis. Dedicated browser tests cover deep-link aliases and the full blend → calculation → schedule → older-label-snapshot path.

## Five fidelity surfaces

| Surface | Result |
|---|---|
| Typography | Actual self-hosted IBM Plex Sans, weights 400/500/600, readable body and labels; source generated glyphs are approximate. Long product names remain visible. |
| Layout and spacing | Product-first hierarchy and returning-plan action retained; compact mobile layout, bounded desktop content, native controls and disclosures. Functional touch targets take priority over compressed image-mock controls. |
| Color and tokens | Mineral white, graphite and orange tokens; pure CSS colors, no copied grain or artificial button texture. Neutral unknown states, clear focus and error boundaries. |
| Images | A separately generated, explicitly illustrative BPC-157 vial is used only in the educational homepage example. Astro optimizes its 1.8 MB source to roughly 12 KB WebP. User records use their real entered text, without fabricated supplier photos or an unimplemented upload feature. |
| Copy/content | Product labels, quantities, unknown states, entered amounts and version distinctions preserved; no suggested doses, frequencies or combinations. Chinese UI and error copy covered by AST translation checks. |

## Accepted adaptations and remaining gaps

- Native open/closed disclosure markers follow browser conventions. Existing library/planner shortcuts, privacy, disclaimer and consent controls remain, extending the page beyond the static source image.
- The real product uses an empty state and real saved records; it never seeds the source mock's example products into a visitor's storage.
- These checks establish browser-rendered behavior and a coherent implementation of the approved direction, not pixel identity with generated glyphs or real-device iPhone Safari acceptance.
- P3: the quick-calculator helper and terminology explanation continue below the first mobile fold, after the complete label example. Returning users have their product/plan workspace above this content.

## Verification

Chrome desktop plus Playwright iPhone WebKit: 54 end-to-end tests passed; 28 domain/translation unit tests passed. Includes primary navigation, product CRUD, label validation, storage failure, legacy/current backup restore, calculator limits, timezone/calendar behavior, language drafts, exports/print and consent-gated anonymous events. Console errors and horizontal overflow were checked by the route tests. No real Google collection is made in automated tests.

Independent finish review: `ship`, based on code and desktop/mobile screenshots. The implementation owner additionally inspected the normalized combined before/after comparisons. No actionable P0/P1/P2 remains.

final result: passed
