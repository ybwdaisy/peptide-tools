# First SEO/GEO pass — 2026-11-23

## Baseline and scope

Started from main `fe7f875486e54e301d6413156fee9fa542039fa0` in the isolated `peptide-tools-seo` worktree / `codex/seo-arithmetic` branch. Production alias resolved to `dpl_AVvCQ57Fnh6REobBeh6K4p1GquyP` on that commit. Other worktrees and their uncommitted files were preserved.

Static HTTP baseline: all 44 sitemap pages returned 200 with matching canonicals, descriptions, one nonempty H1 and three real language alternates. Six personal-workspace URLs were noindex and outside the sitemap. There were no invented `lastmod` values. Robots already allowed public crawlers through `User-agent: * / Allow: /`; no training-crawler choice was changed. The planner's additional empty print-only H1 is populated from local data, and is preserved.

Local evidence: `qa/screenshots/seo-2026-11-23/before/` contains the exact sitemap/robots/funnel manifest, canonical URL inventory, raw HTML, metadata inventory and isolated desktop/mobile-WebKit screenshots. These files are ignored, not deployment inputs.

## Changes and preservation

- Existing calculator pages gain visible source-linked explanations of mg/mcg, mg/mL and U-100 scale/volume arithmetic. Examples do not populate inputs. The calculator title and description name these dimensions clearly.
- Home and library pages link directly to those three anchors in the corresponding language. No new page or article route; sitemap remains 44 canonical URLs.
- Public pages carry factual WebPage/WebSite JSON-LD matching their title, description, canonical and actual language. No rating, offer, clinical authority or special GEO schema is claimed.
- Explicit free IndexNow command validates only six changed pages, production key/content and successful receipt; it is never called by the browser or build. See [maintenance instructions](../seo/README.md).
- CI adds built SEO/IndexNow validation. Source files for arithmetic, plans, actual records, storage, migrations/backups, exports, consent and event contracts remain untouched. The existing funnel manifest revision and all GA4 QA/offline acceptance rules remain intact.

Content URLs: `/`, `/zh`, `/calculator`, `/zh/calculator`, `/library`, `/zh/library`. Existing public pages also receive matching basic structured metadata through the shared shell; unchanged reference articles are not resubmitted as new content.

## Primary sources checked

- [NIST metric prefixes](https://www.nist.gov/pml/owm/metric-si-prefixes): milli and micro factors; the 1,000-fold mass conversion is arithmetic from these definitions.
- [IUPAC mass concentration](https://goldbook.iupac.org/terms/view/M03713): mass relative to mixture volume. Examples use confirmed final solution volume, not an assumed diluent volume.
- [DailyMed official U-100 label](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b519bd83-038c-4ec5-a231-a51ec5cc291f): U-100 convention and matching syringe. Used only to establish the scale; not evidence for peptide administration, dosing or safety.
- [Google AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): useful crawlable content and ordinary SEO; no special AI schema required.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) and [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): public search crawlers are already allowed by the wildcard robots policy.
- [IndexNow documentation](https://www.indexnow.org/documentation) and [FAQ](https://www.indexnow.org/faq): fixed public ownership key, changed canonical URLs, HTTP 200/202 meanings and no indexing guarantee.

## Verification and release evidence

Run type checks, unit tests, production build, site/SEO/funnel checks and the complete desktop Chrome/mobile WebKit regression suite before merging. New tests also cover localized anchor navigation without default inputs, example-result consistency, overflow and safe IndexNow rejection of wrong hosts, stale changes, redirects, noindex, wrong keys and mismatched deployed content.

Local result: type check 0 errors/warnings, 54 unit tests passed, production build/site/SEO/funnel checks passed, and 128 browser tests passed in the complete rerun. The initial run had two local preview request timeouts; both passed unchanged on targeted rerun and in the subsequent complete run. The final return-to-calculator link also passed all four bilingual desktop/mobile tests after rebuilding. No analytics assertion was removed or relaxed.

Production acceptance uses static HTTP inventory and an isolated browser context with SDK/collection interception installed before navigation, explicit QA flags, zero analytics attempts and runtime-error checks. Recheck arithmetic success/error, leap-day scheduling, local save/reload, JSON backup, ICS and Today access. Screenshots and the final deployment/IndexNow receipts are retained under ignored `qa/screenshots/`; the release reply records the PR, merge SHA, deployment ID and response status.

GSC and Bing consoles are coordinated in Site Pulse, not operated here. Recommended canonical URL inspection: `https://peptides.ybwdaisy.com/calculator`, `https://peptides.ybwdaisy.com/zh/calculator`, `https://peptides.ybwdaisy.com/library`. Physical iPhone testing and eventual indexing/AI citation are separate from browser emulation and notification acceptance.
