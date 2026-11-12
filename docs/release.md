# Production release and rollback

Updated: 2026-11-13. The owner authorized merging, production deployment and subdomain setup.

## Current production

- Live: https://peptides.ybwdaisy.com
- MVP: https://github.com/ybwdaisy/peptide-tools/pull/1
- Real-SDK privacy fix: https://github.com/ybwdaisy/peptide-tools/pull/2
- Deployed source main commit: `cbc8b89febcae61eda09fa21c0e2a69cf35278c7` (Chinese language support, PR #5).
- Passing source CI: https://github.com/ybwdaisy/peptide-tools/actions/runs/43320686303
- Vercel project `peptide-tools`, scope `ybwdaisys-projects`; Node 24, Astro, `npm run build`, output `dist`.
- Active production `dpl_9TFnF7aDFGDcVmE23jFds5ytXnhP`.
- Deployment URL: https://peptide-tools-4jiz27nwj-ybwdaisys-projects.vercel.app
- Public Measurement ID `G-B34CBGW0EF` is active in production only. Final production privacy/count checks and GA4 Realtime/DebugView reception passed; see `analytics-setup.md`.

Alibaba Cloud has an enabled `peptides` CNAME to `757213d368615bb6.vercel-dns-017.com`, TTL 10 minutes. Vercel verified correct configuration, valid HTTPS and public HTTP 200. Apex, www, verification records and nameservers were preserved.

Search Console URL-prefix ownership is verified. Sitemap submission reports Success and 22 discovered pages. Initial calculator/reference inspections were unknown to Google; submission does not prove indexing.

## Future releases

Use a new branch and PR, required CI and relevant browser checks. GitHub repository `ybwdaisy/peptide-tools` is now linked to this Vercel project; `main` is the production branch. Branch pushes create previews, and merges/pushes to `main` are configured for production deployment. Wait for required CI before merging.

Use authenticated CLI source deployment only as a deliberate fallback, rather than duplicating a Git-triggered release:

```sh
vercel deploy --prod --yes --scope ybwdaisys-projects --project peptide-tools --verify
```

Repository connection and production branch were verified through the project API on 2026-11-13. Preview deployments are not disabled, the ignore-build command is unset, and the repository has no `git.deploymentEnabled: false` or legacy `github.enabled: false`. A Git push-triggered preview is the end-to-end verification step; retain its result in the documentation PR.

`gitProviderOptions.createDeployments` controls GitHub `deployment_status` event records, not whether a push builds on Vercel. A value of `disabled` must not be interpreted as disabling automatic Vercel deployments. See the [official provider definition](https://github.com/vercel/terraform-provider-vercel/blob/main/docs/resources/project.md#nested-schema-for-git_provider_options). No notification settings were changed.

Preview/local builds have noindex/nofollow, disallow crawling and omit production GA4 configuration. Default Vercel aliases cannot collect because of the exact-origin gate. Local browser protocols do not transfer between origins; use deliberate JSON backup/restore when needed.

## Rollback

Known privacy-safe analytics-paused fallback:

- `dpl_GcAv1Qj82ywP11kKNp5GKTSUnNyk`
- https://peptide-tools-ew76abpu1-ybwdaisys-projects.vercel.app
- Source `c5c0ed4ec9576074c0cf1262db22de542f0e8517`, built with the Measurement ID absent; tools remain available.

Roll back in Vercel to this exact deployment, or revert source through a PR and deploy. **Do not promote initial `dpl_GSurr16iGtwrEMsjt4U6yKbxXF36` with analytics enabled**: it predates the real-SDK privacy fix. An old deployment retains its build-time environment; changing today's variable does not sanitize it.

For a collection incident, remove this project's production `PUBLIC_GA_MEASUREMENT_ID` and rebuild, then verify zero Google requests even after consent. Preserve shared main-site/PolicyPilot configuration unless explicitly authorized otherwise.

Static rollback does not restore browser-local protocols. Preserve version-1 imports and the storage key; do not clear data or redirect to an unrelated homepage.
