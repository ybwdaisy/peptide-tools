# Focused product label UI — design QA

Date: 2026-11-15. Mode: full app redesign. The owner chose displayed option 3 and accepted smaller typography, fewer blue panels and native phone product selection.

## Visual truth and state

- Source: `qa/design-target/product-label-desktop.png` (1487×1058 pixels), normalized to1440×1024 for comparison. The negligible aspect-ratio rounding is <0.06%; no UI is cropped or stretched materially.
- Implementation: `qa/evidence/focused-label/en-products-desktop.png`, static browser-rendered1440×1024, CSS viewport1440×1024, deviceScaleFactor1. English, synthetic BPC-1575mg/2mg/mL record selected; two other synthetic records. Analytics denied, isolated context. Source examples are never seeded into the real application.
- Full comparison: `qa/evidence/focused-label/comparison-desktop.png` (source left, implementation right).
- Focused comparison: `qa/evidence/focused-label/comparison-detail.png` (source above, implementation below). This makes product facts, confirmation and actions readable without judging from a scaled full view alone.
- Phone evidence: `zh-products-phone.png`, `zh-products-new-phone.png`, `zh-calculator-phone.png`, `zh-planner-phone.png` in the same evidence directory. CSS390×844, density1;320px was also checked. Chrome viewport emulation is not a physical iPhone session. Existing mobile-WebKit E2E uses iPhone13 emulation.

## Findings

No actionable P0/P1/P2 visual mismatches remain. The narrower actual1120px content measure, smaller30px task title/24px record title and retained safety/record content are intentional product constraints, consistent with the accepted refinements. The generated illustration is not a pixel-perfect specification for all existing states.

Required fidelity surfaces:

- **Typography:** local Schibsted Grotesk variable Latin, native CJK fallback;16px body,14px labels,30px task titles,24px selected product title,30px concentration. Units and values use tabular numerals. Current selection and action hierarchy remain readable in both locales. Font load checked in Chrome; no remote font requests.
- **Spacing/layout:** one capped container; grouped selector and open facts with a concentration divider; native phone selector and one-column detail. Inputs/results and label/concentration entry groups use rules rather than enclosing blue cards. No clipping at320/390/1440px across the six checked routes.
- **Colors/tokens:** near-white cool base, navy ink, slate secondary text, blue selection/action; all CSS values live in shared tokens. Primary text and fields retain contrasting edges and immediate focus states. No gradients, shadows or decorative backgrounds added.
- **Images/assets:** no raster asset is implied by the selected product-label mock. Existing marked educational vial remains the actual supplied asset on home; no fake supplier product photos or CSS object drawings. Existing app/favicon icons retained. Astro development image endpoint changes to the compiled static webp, not a dropped image.
- **Copy/content:** existing clinical limits, confirmation wording, blend facts, source references, backup/restore and consent text retained. No actual-use history, reminders, adherence, inventory or clinical verification invented. Product-specific quantities remain user input. The reference, related/all saved schedules and delete controls absent from the illustrative mock remain subordinate and reachable.

## Comparison history and verification

1. Development screenshots contained Astro's toolbar and were rejected as handoff evidence. Switched to actual static build and recaptured. This was evidence correction, not a visual design iteration or a claimed test pass.
2. Compared the actual static product screen and focused detail to the selected reference in the combined inputs listed above. No P0/P1/P2 design fix was required after that comparison.
3. Independent fresh-context Hallmark finish reviewer inspected supplied screenshots and source: **ship**,0 actionable findings. The old screenshot showed a more explicit empty-state instruction, but used a different unpopulated state; the real empty state remains preserved.
4. Functional verification:35 unit tests;88 full Chrome/mobile-WebKit tests passed, plus the2 added selection-event checks passed in a targeted6-test selector suite. Covers old data preservation, confirmations, blend basis, named calculation reuse, backups, language changes, dates/DST/export and analytics enum/consent policy.36 Chrome route/viewport cases checked overflow, script errors and denied analytics; no errors or Google requests.

## Implementation checklist

- [x] Selected label, vial amount and concentration visibly distinct.
- [x] Mobile selection, links, confirmation gates and keyboard focus work.
- [x] Existing functional and analytics contracts preserved; same-page backup fragment fixed.
- [x] Before/after render record and independent review completed.
- [x] Local production-style static preview remains available.

Follow-up polish: physical iPhone Safari review remains unperformed. No claim of production GA4 reception or deployment is made by local UI acceptance.

## Approved logo follow-up — 2026-11-16

The owner subsequently selected cycle-logo option3, superseding the text-only header and orange P icon in earlier UI evidence. The selected source, vector/raster assets, small-size proof,12 EN/ZH header cases,641px collision correction and independent ship review are recorded in `qa/logo-cycle-validation.md`. Other UI facts and behavior remain as reviewed above.

final result: passed
