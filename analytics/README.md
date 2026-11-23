# Published funnel configuration

Edit only `funnels.json`. Its five initial flows come from the approved Site Pulse seed; preserve their stable IDs and confirmed steps, filters and intervals. The configured exclusion of 20261112 is an existing documented rule, not an inference about unmarked historical traffic. The first-product flow retains create-only operation filters. Do not infer new business sequences from new event names.

- Authority: https://site-pulse-nine-tau.vercel.app/contracts/funnels-v1.md
- Schema: https://site-pulse-nine-tau.vercel.app/contracts/funnels-v1.schema.json
- Public product endpoint: https://peptides.ybwdaisy.com/.well-known/site-pulse.json

`contracts/` caches the reviewed authority files for offline development. `npm run verify:funnels:remote` compares both public JSON/Markdown files byte-for-byte with that cache and fails on unavailable or changed content. Review an authority change before refreshing the cache; download JSON/Markdown only, never remote JavaScript.

`npm run build` validates the schema, exact hostname, unique IDs/events, finite OR candidates and the actual `EVENT_NAMES` from `src/lib/analytics-policy.ts`, then copies the same source bytes to `public/.well-known/site-pulse.json`. After Astro builds, the generated `dist/.well-known/site-pulse.json` must also match. Do not independently edit either generated file. Increment revision when changing configuration.

`npm run verify:funnels` fails for a missing/invalid source or missing/stale published file. CI runs this and the online-authority check before its existing complete type/unit/build/browser checks. Offline negative tests cover schema/hostname/QA mistakes, event drift, duplicate IDs/events, invalid OR lists, missing/stale outputs and remote mismatch/failure.

This is product-published configuration, not a Google Explore sync or an analytics report. Site Pulse owns its consumer/cache/fallback logic. These changes send no events, change no Google filters and contain no credentials or user data. Existing QA zero-collection rules and offline visitor fixtures remain intact.
