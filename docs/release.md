# Preview, release and rollback

## Review gate

Work is on `codex/peptide-tools-mvp`. Do not merge, deploy production, attach the production domain or change DNS until the owner approves the reviewed result. A branch preview is authorized.

## Before production

1. Confirm PR checks and browser results; complete the analytics admin settings in `analytics-setup.md`.
2. Confirm Vercel project `peptide-tools` under `ybwdaisys-projects`, Node 24, Astro framework, build `npm run build`, output `dist` and production branch `main`.
3. Confirm public production config `PUBLIC_GA_MEASUREMENT_ID=G-B34CBGW0EF`; add Search Console verification only if needed. No secrets belong in public env variables or Git.
4. After approval, attach `peptides.ybwdaisy.com` to this project. Obtain the exact CNAME target from Vercel's domain instructions, then add only the `peptides` DNS record at Alibaba Cloud. Do not guess the target or change apex/homepage records.
5. Merge/deploy the approved SHA. Confirm TLS, redirects, real status codes, robots allowing indexing, canonical URLs and sitemap URLs on the production hostname.
6. Complete production analytics acceptance and Search Console submission. Record the launch date and exclude developer/acceptance events from demand evidence.

## Preview behavior

Preview has noindex/nofollow, disallows crawling and does not load GA4. Protocols in preview storage do not transfer to production automatically; use JSON export/import if transferring test data deliberately.

Vercel automatically classified the project's first CLI deployment as production despite `--environment preview`. An explicit REST `target: staging` request with automatic custom-domain assignment disabled was also reclassified as production. Both exact deployments were removed; the project was verified to have no remaining deployments or production target. Remote review deployment remains pending a supported safe first-deploy workflow or the owner's approval for initial production setup. Do not retry these commands as previews. Default Vercel aliases cannot enable analytics because of the independent runtime origin gate.

Vercel Git repository connection requires granting its GitHub App access to this new private repository; source deployment does not establish Git integration.

## Rollback

Record the first stable production deployment ID after launch. For later releases, use Vercel rollback to that recorded deployment or revert the responsible commit through a PR. Static source rollback does not restore browser data; preserve the version-1 importer and storage key. No automatic downgrade or clearing of local data is implemented.

For the first release with no prior stable version, remove the subdomain assignment or show a deliberately reviewed maintenance build rather than directing it at an unrelated homepage. Never delete saved local data as part of a release rollback.
