# StretchBreak

Plan time off around public holidays, your workweek and employer closures. The calendar, suggestions, statistics and saved plans work without AI. Holiday availability depends on country, region, year and employer; see the [holiday policy](HOLIDAY-DATA-POLICY.md) and [2026–2027 audit](reports/HOLIDAY-AUDIT-2026-09-22.md).

## Local development

Use patched Node.js 22.23.4 or a newer patched 22.x release (`.nvmrc` selects 22.23.4).

```sh
npm ci --ignore-scripts
npm run dev
```

For Netlify Functions, use `npm run dev:full`. Copy `.env.example` to `.env` only if you need local AI configuration. AI is disabled by default and requires all controls described in [AI-SECURITY-SETUP.md](AI-SECURITY-SETUP.md), including verified access and durable accounting. An API key alone does not enable AI. Never put a secret in a `VITE_` variable.

## Planning

1. Select your country, work region, year or date range, and annual PTO allowance.
2. Confirm working days and employer holiday exceptions. Carryover is tied to the selected year and expiry month.
3. Preview a suggested break or select dates manually. A preview creates a draft; save it explicitly to allocate leave.
4. Review connected-break totals, export exact leave dates, or create an out-of-office template for one break.

Plain-English break search runs locally. Optional AI suggestions rank server-calculated candidates, and chat provides advisory guidance. Shared links contain readable snapshots and cannot be revoked; browser storage is local to the device.

## Release checks

```sh
npm run check
npm audit --audit-level=high
```

`check` runs TypeScript, ESLint, regression tests and the Vite production build. Netlify builds use this check, and `.github/workflows/ci.yml` runs it on pushes and pull requests once committed. Build output is in `dist`.

```sh
npm run audit:holidays -- 2026 2027
node --env-file=.env scripts/check-ai-config.mjs --allow-disabled
npm run check:deployment -- https://your-production-origin --expect-ai=disabled
```

The holiday audit checks provider coverage and schema separately from pinned official-date comparisons. It does not certify all worldwide employee entitlements. Deployment smoke checks never make paid AI calls. Use `--expect-ai=ready` only after real production access and storage controls are configured.

The scoped `ipx → sharp@0.35.5` override fixes upstream image-library advisories while retaining the current Netlify CLI. A regression test covers its PNG/WebP/AVIF pipeline. Reassess the override when IPX adopts a patched version directly. [Sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).

See [implementation status](IMPLEMENTATION-STATUS.md) for completed work and external prerequisites.

## Technology and license

React 19, TypeScript, Vite, date-fns, Nager.Date, Netlify Functions/Blobs and optional OpenAI API. License: CC-BY-NC-4.0.
