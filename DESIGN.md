# PeptideTools visual system

Approved visual target: `../peptide-tools-review/visual-v3/01-home-reviewed.png` and `02-my-products-reviewed.png` (2026-11-13).

## Scope and idea

Hallmark app scope. A product label becomes a persistent local record: name, amount in one vial, composition and verified concentration stay beside calculations and schedules. Existing functionality, evidence limits, consent and browser-local storage remain.

## System

- Mineral-white ground `#F0F1EE`, near-white surface `#FAFBF9`, graphite text `#242725`, secondary text `#646A66`.
- Orange `#C2471D` marks the primary action. Selection and ordinary links are graphite. Unknown information stays neutral; orange is not a claim of safety or verification.
- Local IBM Plex Sans variable font, regular 400, medium 500 and semibold 600. Use the same family for headings and controls. No uppercase tracking, decorative monospace labels or artificial bold.
- All colors and font families resolve through `src/styles/tokens.css`; the `@font-face` declaration names the actual font file.
- Flat grouping, open lists and rules before containers. Controls use a 4px radius and at least a 44px target. No grain, gradients, mint pills, bevels or ornamental molecular drawings.
- Mobile-first, readable 16px body text, 14px helpers and 20px phone gutters. Desktop content is capped and centered. Every focus indicator is immediate; content remains visible without motion or scripting.

## Material and facts

Generic generated vial artwork belongs only to clearly marked educational label examples. It is not a supplier photograph or an image of a user's product. Never infer product quantities, concentration, identity, dosage, frequency or combination from the name. `5 mg` on the example vial is total mass, not concentration.

## Existing functionality to preserve

Calculator and U-100 distinctions; reference sources and dates; protocol repeat rules, time zones, print and exports; no-account local storage and recoverable backups; English default and Chinese; consent-gated privacy-safe analytics; icons and all public routes.

Build, browser checks, independent finish review and limitations are recorded by the implementation owner. The approved mock images are visual targets, not verification evidence.
