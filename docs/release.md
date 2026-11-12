# Production release and rollback

## Published release

The owner explicitly authorized merging, production deployment and subdomain/DNS setup on 2026-11-12.

- Live site: https://peptides.ybwdaisy.com
- Merged PR: https://github.com/ybwdaisy/peptide-tools/pull/1
- Main/source commit: `c5c0ed4ec9576074c0cf1262db22de542f0e8517`.
- Main CI: https://github.com/ybwdaisy/peptide-tools/actions/runs/43202654613 (passed).
- Vercel project: `peptide-tools`, scope `ybwdaisys-projects`, Node 24, Astro, `npm run build`, output `dist`.
- Current production: `dpl_GcAv1Qj82ywP11kKNp5GKTSUnNyk`, deployed from the same source commit with analytics paused.
- Initial authorized production: `dpl_GSurr16iGtwrEMsjt4U6yKbxXF36`. **Do not roll back to this configuration while the Google tag privacy defect remains unresolved.**

Alibaba Cloud DNS has an enabled `peptides` CNAME to `757213d368615bb6.vercel-dns-017.com` (TTL 10 minutes). Vercel reports configured correctly and verified; HTTPS returns 200. Apex, www, other verification records and nameservers were preserved.

## Analytics hold

Real Google SDK acceptance found extra automatic page views, including a concrete library slug/title, despite the application's manual sanitization. Only this project's production `PUBLIC_GA_MEASUREMENT_ID` was removed, followed by a fresh source deployment. Production now has analytics disabled; consent and tools remain functional. Restoring the ID requires successful privacy verification, not just enabling the environment variable.

The owner chose reuse of the existing main-site stream and subsequently explicitly authorized disabling its Enhanced measurement. This was completed and verified off after the initial approval rejection. The application also applies global privacy defaults before tag initialization. Candidate SDK verification is distinct from production acceptance; keep collection paused until the full check passes. See `analytics-setup.md`.

## Future releases

Use a new branch and PR, required CI and relevant browser checks. Source deployments currently use the authenticated Vercel CLI. The Vercel GitHub App lacks access to this private repository, so automatic deployments on push are not configured. Do not make the repository public to solve this.

Before an analytics-enabled release, verify actual Google request payloads, counts, Realtime/DebugView, processed reports and consent withdrawal. Complete Search Console verification and sitemap submission separately. Public accessibility does not prove indexing.

## Preview behavior

Preview has noindex/nofollow, disallows crawling and does not load GA4. Default Vercel aliases cannot enable analytics because of the exact runtime origin gate. Browser-local protocols do not transfer between origins; JSON backup/restore is available when deliberate transfer is needed.

Before production approval, Vercel unexpectedly classified two first-deploy preview/staging attempts as production; both exact deployments were removed. The current production deployments above were subsequently authorized and must be retained.

## Rollback

The current known-safe deployment is `dpl_GcAv1Qj82ywP11kKNp5GKTSUnNyk` (tools available, analytics paused). Use Vercel rollback to this deployment or revert a later source change through a PR. An earlier deployment retains its own build-time environment values, so removing the current environment variable does not sanitize an older deployment.

Static rollback does not restore browser-local data. Preserve the version-1 importer and storage key. Never clear saved protocols or redirect the subdomain to an unrelated homepage as part of rollback.
