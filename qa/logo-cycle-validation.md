# Cycle logo implementation

Date: 2026-11-16. Owner chose displayed logo option 3, the three-segment open loop with a short right-hand terminal. Reference: `qa/design-target/logo-cycle.png`.

## Delivered assets

- `public/brand/mark.svg` and `mark-inverse.svg`: real vector paths; geometry traced from the selected mark and simplified to smooth curves. No embedded raster artwork, animation or runtime drawing.
- `public/brand/logo.svg` and `logo-inverse.svg`: self-contained vector mark and PeptideTools text, with embedded Schibsted Grotesk and font-license metadata. Font license also included separately.
- Transparent PNGs: standalone marks 1024×1024; combination wordmarks 880×160.
- Existing favicon paths preserved. SVG source, native 16/32px PNGs, ICO containing 16/32/48px PNG images. iOS icon is a completely opaque, full-bleed180×180 square; iOS applies the corner mask.
- Header adds a decorative32px mark to the existing text home link. Localized accessible name, href, analytics and all business logic remain unchanged.

## Verification

- `npm run check`:61 files,0 errors/warnings/hints.
- Static build/site verification:50 pages,44 sitemap URLs; local assets, metadata and links passed.
- Eight existing Chrome/mobile-WebKit route/layout and JavaScript-off browser cases passed after the final header fix. No existing test expectation modified.
- `node scripts/verify-cycle-logo.mjs`:12 EN/ZH combinations at1440,768,700,641,390,320px. Verifies loaded SVG, actual32px mark, home href and navigation, visible focus, document width and pairwise header-control collision. Isolated local contexts, analytics denied; no application errors or Google collection requests.
- PNG alpha channels/dimensions checked; ICO native size directory checked; iOS icon opacity/dimensions checked.16px proof uses the actual16px raster generated for the ICO, not a resized32px sample.
- Hallmark actual render:0 FAIL,0 WARN,0 open Reflex (14 previously justified heuristic dismissals retained).
- Independent fresh-context logo/header finish review: **ship**,0 actionable findings. Selected silhouette remains recognizable at small sizes; all supplied header screenshots and focus states clear. Screenshot/source review, not a separate browser session.

## Comparison and correction

`qa/evidence/logo-cycle/brand-proof.png` shows the regular/reverse lockups, standalone mark, iOS icon and native small sizes. Width screenshots and focus captures are in the same directory; `verification.json` contains measured results. Previous header evidence remains in `qa/evidence/focused-label/`.

An intermediate641px width exposed overlap between Library and EN after adding the mark. Only the header breakpoint was moved from40rem to48rem so navigation wraps before it collides. Rebuilt the final static assets and recaptured all12 cases; no collisions remain. The product/forms layout breakpoints were not changed.

Build reproducibility: run `scripts/build-cycle-logo.mjs`, then `scripts/generate-icons.mjs`; build the site, then run `scripts/verify-cycle-logo.mjs` against the local static preview to export transparent PNGs and evidence. These use existing project tooling, with no new dependency or remote font service.

Physical iPhone installation has not been tested. This is an asset/layout verification and preview delivery, not a production release. Revert the logo commit to restore the earlier header and icons; no data migration is involved.

final result: passed
