# Production release and rollback

Updated: 2026-11-12. The owner authorized merging, production deployment and subdomain setup.

## Current production

- Live: https://peptides.ybwdaisy.com
- MVP: https://github.com/ybwdaisy/peptide-tools/pull/1
- Real-SDK privacy fix: https://github.com/ybwdaisy/peptide-tools/pull/2
- Deployed source main commit: `24c32d76dd6ef00570951f62a6f04105b3a4d5f0`.
- Passing source CI: https://github.com/ybwdaisy/peptide-tools/actions/runs/43218006404
- Vercel project `peptide-tools`, scope `ybwdaisys-projects`; Node 24, Astro, `npm run build`, output `dist`.
- Active production `dpl_ERqBeqyQ8FdwY3FuAZELCwWLEzCX`.
- Deployment URL: https://peptide-tools-h323puk16-ybwdaisys-projects.vercel.app
- Public Measurement ID `G-B34CBGW0EF` is active in production only. Final production privacy/count checks and GA4 Realtime/DebugView reception passed; see `analytics-setup.md`.

Alibaba Cloud has an enabled `peptides` CNAME to `757213d368615bb6.vercel-dns-017.com`, TTL 10 minutes. Vercel verified correct configuration, valid HTTPS and public HTTP 200. Apex, www, verification records and nameservers were preserved.

Search Console URL-prefix ownership is verified. Sitemap submission reports Success and 22 discovered pages. Initial calculator/reference inspections were unknown to Google; submission does not prove indexing.

## Future releases

Use a new branch and PR, required CI and relevant browser checks. Authenticated CLI source deployment:

```sh
vercel deploy --prod --yes --scope ybwdaisys-projects --project peptide-tools --verify
```

The Vercel GitHub App lacks access to the private repository, so automatic Git deployments are not connected. CLI deployments work. Do not make the repository public to solve this. Documentation-only commits do not require redeploying the accepted runtime.

Preview/local builds have noindex/nofollow, disallow crawling and omit production GA4 configuration. Default Vercel aliases cannot collect because of the exact-origin gate. Local browser protocols do not transfer between origins; use deliberate JSON backup/restore when needed.

## Rollback

Known privacy-safe analytics-paused fallback:

- `dpl_GcAv1Qj82ywP11kKNp5GKTSUnNyk`
- https://peptide-tools-ew76abpu1-ybwdaisys-projects.vercel.app
- Source `c5c0ed4ec9576074c0cf1262db22de542f0e8517`, built with the Measurement ID absent; tools remain available.

Roll back in Vercel to this exact deployment, or revert source through a PR and deploy. **Do not promote initial `dpl_GSurr16iGtwrEMsjt4U6yKbxXF36` with analytics enabled**: it predates the real-SDK privacy fix. An old deployment retains its build-time environment; changing today's variable does not sanitize it.

For a collection incident, remove this project's production `PUBLIC_GA_MEASUREMENT_ID` and rebuild, then verify zero Google requests even after consent. Preserve shared main-site/PolicyPilot configuration unless explicitly authorized otherwise.

Static rollback does not restore browser-local protocols. Preserve version-1 imports and the storage key; do not clear data or redirect to an unrelated homepage.
