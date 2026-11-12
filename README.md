# Peptide Tools

An independent, English, browser-local calculator, evidence reference and schedule planner for `peptides.ybwdaisy.com`. No accounts or business backend. No dose recommendations.

## Run

Node 24.x and npm:

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
```

Open `http://127.0.0.1:4321`. Astro 7 may run its server in the background in agent environments; use `npx astro dev stop` to stop it.

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run verify:site
npx playwright install chromium webkit
npm run test:e2e
```

Local Chrome tests use installed Google Chrome; CI uses Playwright Chromium. The mobile project uses WebKit with iPhone 13 emulation, not a physical iPhone. Browser tests must run against the built preview, not an existing Astro development server with its overlay. The test runner starts a preview if port 4321 is free.

## Data and behavior

- Decimal arithmetic accepts positive decimal strings (up to 9 integer and 8 fractional digits), converts mcg/mg to mL, and optionally shows U-100 scale markings. No activity-IU conversion or dose recommendation.
- Planner retains local clock times through DST; ambiguous clock times use the first occurrence, nonexistent times require editing. UTC calendar events preserve the selected zone's instants, with no alarms.
- Browser storage key: `peptide-tools.protocols.v1`; JSON backups use `{ version: 1, protocols: [...] }`. Max 20 protocols, 20 items each, 366 days each, 1 MB imports. Unknown imported properties are dropped; invalid imports do not replace data.
- 16 reference pages cite primary sources. Study-specific half-lives appear only with formulation and route context. Unknown fields are deliberate, not default recommendations.
- No external fonts, images, identity service, application API or protocol uploads. GA4 loads only with opt-in consent and production configuration; exported files intentionally contain the user's own data.

## Deployment and analytics

Vercel project: `peptide-tools` under `ybwdaisys-projects`. Production variable `PUBLIC_GA_MEASUREMENT_ID` is set to the public ID supplied by the owner. Preview has noindex and analytics disabled. The production domain and DNS are not changed until review approval.

- [Development plan](peptide-tools-development-plan.md)
- [Verification status](docs/verification.md)
- [GA4 / Search Console setup and acceptance](docs/analytics-setup.md)
- [Release and rollback](docs/release.md)

Never commit `.env*`, `.vercel`, OIDC tokens, credentials, browser profiles or traces containing real user data. `.env.example` contains public-identifier placeholders only.
