# SEO release checks and IndexNow

The site is English-first with real Chinese pages at `/zh`. Keep canonical URLs query-free, language alternates reciprocal and private local workspaces (`products`, `products/new`, `today`) noindex and outside the sitemap. Do not add crawler-specific allow rules when the existing wildcard allows public content, or change training-crawler choices as a side effect.

`npm run build`, `npm run verify:site` and `npm run verify:seo` validate built metadata, internal links, the 44 canonical public URLs, real language pairs, visible unit guides, matching WebPage/WebSite structured data and the IndexNow release list. CI runs the same checks. Set `VERCEL_ENV=production` for local production-metadata checks; previews remain noindex/disallowed. The existing funnel source/generation/remote-contract checks remain mandatory.

## Explicit IndexNow notification

The key in `indexnow.json` and its root `.txt` file are intentionally public ownership proof. No private token, new service, paid resource or Google credential is required.

1. Replace `changes` in `seo/indexnow.json` with only canonical pages that were added or substantially changed in the release. Record the real update date and reason. Do not accumulate the full sitemap, invent fresh dates for old changes or include personal/result URLs. Increment the release revision.
2. Build and run all checks. `npm run verify:seo` is offline and never notifies a search engine. The list is capped at 20 pages to keep notifications scoped.
3. Merge only after CI and browser checks. Verify Vercel's production team, project, source commit and actual domain alias.
4. Run `npm run indexnow:submit` once from the tested worktree after deployment. On a Mac using an environment HTTP proxy, use `NODE_USE_ENV_PROXY=1 npm run indexnow:submit`. This command refuses changes older than 30 days, verifies the public production key, rejects redirects/noindex/noncanonical pages, and compares each production `<main>` content hash with the current build before posting to the fixed official endpoint. A mismatched build fails before notification.
5. Preserve `qa/screenshots/indexnow/<revision>.json`. The receipt records the endpoint, exact URLs, content digest, timestamp and HTTP status. An accepted identical digest is skipped on a repeated run in this worktree. Do not delete the receipt to repeat a notification; across worktrees, consult the release evidence first.

HTTP 200 means notification received; HTTP 202 means received with key validation pending. Neither proves crawling, indexing, ranking or AI citation. Failed responses are recorded and fail the command; diagnose before retrying. This is an explicit release command, not a build hook, browser request or recurring whole-site submission.

Official protocol: [documentation](https://www.indexnow.org/documentation), [FAQ](https://www.indexnow.org/faq).

## Content and analytics boundaries

Unit examples are arithmetic, never recommended doses, mixing/use instructions or efficacy claims. They stay out of form defaults and local user records. Source-backed explanations are visible in the static HTML, linked from the existing home and library; no extra article routes are required.

Before any automated production navigation, install context-level interception for Google SDK and all collection transports, block service workers and enter with `?analytics_test=1`. Public-visitor event assertions stay in the intercepted offline fixture. Do not use real Google events or collector responses as QA evidence. GSC/Bing account administration is separate from repository/deployment work.
