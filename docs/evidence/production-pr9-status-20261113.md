# PR #9 production verification — initial partial record

This records the earlier interrupted run. A subsequent native Chrome run verified create/update and navigation reception. See [current combined evidence](production-sdk-trace-20261113-pr9.json) and [current setup](../analytics-setup.md). The historical pending statements below describe the earlier run only. The proposed Playwright script was never executed; the later acceptance used the supported native computer tool.

- PR #9 merged with user approval: `d93ee74a8649669a38f7406439c23e7160e0c365`.
- Production deployment `dpl_3hvo7oH8ZeNLgmCvWZq6MTXY2j1Z` is READY and serves `https://peptides.ybwdaisy.com`.
- Vercel build log confirms main commit `d93ee74`, deployment completed 2026-11-13T10:53:39.930Z.
- Actual isolated native Chrome denied-consent check passed: calculator concentration 2 and target 250 produced 0.125; DevTools Network filtered to Google showed 0/11 requests. See `production-denied-20261113-pr9.png`.
- After consent, the actual Google SDK and collection requests were observed. A fictitious new product was saved and its detail page displayed. The temporary window disappeared before the full request log could be exported. Consequently exact full-run counts and editing delivery remain unverified.
- Authenticated GA4 Realtime subsequently showed `navigation_action=1`, `product_entry_start=1`, `product_label_view=1`, `product_saved=1`. Drilling into product_saved verified `operation=create` (1) and `traffic_class=qa` (1). These correspond to partial native acceptance, not customer activity. See `ga-product-saved-create-received-20261113-pr9.png` and `ga-product-saved-qa-received-20261113-pr9.png`.
- Native Realtime uses the shared property and includes other sites. Its overall user/event totals must not be interpreted as peptide-site demand. Business explorations retain exact-hostname and QA event exclusion.
- No public product-created key event was intentionally generated. Public derived-key-event receipt remains unobserved.
- Complete fresh create/update count, payload privacy, withdrawal and broader journey acceptance remain pending. Do not mark the current production analytics acceptance complete from these partial observations.
- An isolated real-SDK Playwright script was prepared locally at `qa/screenshots/production-analytics-acceptance.mjs` and syntax checked. It has not been executed. Explicit permission to use that alternate browser technology was requested because the computer-use tool requires it.
