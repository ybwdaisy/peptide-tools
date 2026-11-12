# English and Simplified Chinese

Released scope: English remains the default; `/zh` contains Simplified Chinese versions of the same tools, 16 references and legal pages. The top navigation's **EN / 中文** links switch to the matching page. No browser-language detection changes the default. The brand, substance names, scientific aliases, units and original source URLs remain unchanged.

## Routing and storage

- Existing English URLs are retained. Chinese pages are statically rendered and readable without JavaScript; each page has its own canonical URL and reciprocal English/Chinese alternate links, with English as `x-default`.
- An explicit selector choice is remembered in `peptide-tools.language.v1` localStorage. A returning visit to `/` uses the saved Chinese choice; an explicit non-root language URL remains authoritative. Storage failure does not disable language links or tools.
- Switching languages temporarily saves the open calculator/planner form in `peptide-tools.language-draft.v1` sessionStorage on the same device. The destination consumes/removes it; drafts older than one minute are rejected. Calculator inputs are retained and the result can be recalculated. A generated planner calendar is regenerated locally without recording another tool action.
- Existing saved protocols share the original storage key and backup format. No migration is required. Protocol/item IDs, user text, entered amounts, time zones and calendar instants are preserved across language changes. ICS explanatory text follows the UI language; user-written event titles remain unchanged.

The translation dictionary lives in `src/i18n/zh.json`; server templates and browser status/error text use the same formatter. Values interpolated into messages are not translated or interpreted as HTML. Unknown technical errors receive a generic Chinese error instead of an untranslated raw exception.

## Analytics and search

The original nine application event names, key events and fixed parameter allowlist remain unchanged. `/zh` paths map to the same anonymous page groups as their English equivalents; reference details still report only `/library/detail`. No language, entered values or draft contents are added to event parameters. A preference redirect from the English root skips tag initialization on that interim document.

The sitemap includes 44 indexable URLs: 22 per language. English and Chinese not-found documents are excluded; the build verifies all 46 HTML pages and their local links/assets. The existing Search Console sitemap URL stays the same and can be fetched again by Google; adding Chinese URLs does not mean they have been indexed.

## Validation

- Type checking: no errors, warnings or hints.
- 22 unit tests, including translation/source coverage, placeholder safety, route privacy and localized ICS identity/folding.
- 38 browser checks: installed Chrome and WebKit with iPhone 13 emulation. New cases cover the English default in a Chinese browser, remembered choice, input retention, shared protocol identity, Chinese exports/errors, disabled JavaScript, unavailable storage and sanitized analytics commands.
- Desktop and phone screenshots inspected for the Chinese home page and populated calendar. This is browser-engine simulation, not a physical iPhone acceptance test.
- Analytics browser tests stub the Google SDK; they verify the unchanged command contract. No localization acceptance events need to be added to production demand metrics.
