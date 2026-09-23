# Review implementation status

Published to [StretchBreak](https://stretchbreak.netlify.app) on September 23, 2026 with the owner's explicit approval and **AI disabled**. [Production deploy 6ab44b7b7bb5daa1bb2fc278](https://app.netlify.com/projects/stretchbreak/deploys/6ab44b7b7bb5daa1bb2fc278) includes the simplified three-step interface plus the holiday, planning and security fixes. This report describes the source accompanying that release. Agents handled holiday accuracy, planning correctness, AI security and runtime configuration; the main task integrated their work and verified the live UI.

## Implemented

- Holiday dates use validated date-only values. Regional selection defaults to national public holidays, observances do not silently become days off, unsupported coverage is explicit, and employer exceptions/workweeks are configurable. The Nigeria March 19–20, 2026 declaration has an official-source override. Saved plans retain their holiday/workweek context. Source age and offline status are visible.
- Suggestions, calendar selections, saved-plan breakdowns and analytics count actual connected breaks. Carryover is tied to a year and expiry; balances count overlapping saved/proposed leave once. Previewing creates a draft and saving is explicit. Calendar exports split separate periods and use exclusive all-day end dates. Out-of-office drafts select one connected break and default to local templates; optional AI requests send only that break and message settings.
- Setup and optional filters are shorter. Calendar dates are keyboard-operated buttons with full accessible names, arrow navigation and an agenda. The 390px mobile layout has no horizontal overflow; a preview moves to the relevant month without resetting focus on manual selections.
- Sharing uses URL fragments and explains that readable snapshots cannot be revoked. Webhook credentials are session-only. Backup restore validates before replacement, merges by record ID, and attempts rollback on storage failure. Reset clears application-owned data. Service-worker navigation uses the network first and never caches AI functions.
- AI requires verified guest sessions and durable quotas/cost reservations. Missing configuration or shared storage blocks paid calls. The server obtains holidays and computes candidates; AI can rank only known candidates. Requests and output are bounded, suggestions are explicit requests, and stale responses are discarded. See [AI setup](AI-SECURITY-SETUP.md).
- Regression tests and TypeScript-check scripts were added. Existing TypeScript and lint failures were corrected. Safe dependency updates removed production audit findings.

## Validation

All 67 regression tests, TypeScript, ESLint and the production build pass using Node 22. The production deployment ran the full check gate and bundled all four functions: session verification, chat, suggestions and out-of-office generation. All 27 nonpaid checks against the live hostname passed, including security headers/CSP, exact credentialed CORS, rejected foreign origins, no-store responses and unavailable AI endpoints. The configured AI_ENABLED=false and absent Turnstile credentials explain this rollout's disabled state; the generic 503 response alone does not distinguish these causes.

Live browser verification confirmed that a Netherlands December 24–27 suggestion creates a draft with one selected PTO day, four days off, 19 days remaining from a 20-day allowance, and the correct December calendar. The UI reports AI unavailable while local planning works. Earlier local UI checks confirmed 2 selected PTO days on October 5 and October 30 produce 6 days off; January 1 is retained; keyboard focus survives selection; and the mobile layout fits 390px.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` with Node 22. Security tests use mocked storage, feeds and verification responses; no paid AI calls were made.

## Remaining-work completion pass

- Patched the Netlify development image pipeline with a scoped Sharp 0.35.4 override. The full dependency audit now reports **zero vulnerabilities**, and PNG/WebP/AVIF compatibility is regression tested.
- Audited all 204 advertised countries/territories for 2026 and 2027: 408 feeds and 5,331 records. Added official Nigeria Adha/Mawlid and Scotland January 4, 2027 corrections. Evidence and explicit limits are in [the holiday audit](reports/HOLIDAY-AUDIT-2026-09-22.md).
- Added secret-safe configuration and nonpaid deployment checkers, Node22 setup, GitHub CI and a Netlify build gate running typecheck/lint/tests/build. The included GitHub workflow runs verification on pushes and pull requests.
- Confirmed the linked Netlify account and StretchBreak site. Removed VITE_OPENAI_API_KEY. Its exact value was not found in the two public entry assets checked before release; historical exposure was not ruled out. Set AI_ENABLED=false and ALLOWED_ORIGINS=https://stretchbreak.netlify.app and deployed those settings.
- Generated and saved a cryptographically random AI_SESSION_SECRET. Marked it and OPENAI_API_KEY as protected, production-only secrets; verified metadata without printing values. The account supports protected secrets but not custom function-only scopes, which caused the earlier HTTP403. Both secrets now use the supported Builds/Functions/Runtime scopes with Post processing excluded. Production build access remains security-sensitive.
- Added shared runtime/preflight configuration checks. Hosted AI rejects placeholders, weak signing secrets, test widget keys, malformed origins and explicit preview contexts before storage/provider access. Netlify may omit CONTEXT at runtime, so production-only secret values remain necessary for deployment isolation.

## Simplified planning experience

- Navigation now has three destinations: Plan a break, My breaks and Settings. A three-step indicator follows setup, choosing a break and saving.
- Setup shows country, year and annual PTO with one Find breaks action. Work schedules, regional holidays, carryover, custom dates and employer options live under More options. The duplicate Bridge Board is removed from setup.
- Results show at most three choices with a plain PTO-cost and days-off comparison. Filters, vacation style, text search and available AI assistance share one More options disclosure. The calendar opens only for manual selection or date adjustments.
- Choosing a break opens a compact review with a prominent Save break action. Saving opens the saved break and calendar export. Notifications, out-of-office drafts, budgets, sharing, versions and detailed calendars are collapsed. Analytics and team tools live in Settings. Unavailable AI notices and drafting controls are hidden.
- Verified on desktop and at 390px: setup, choosing, saving and calendar export; no horizontal overflow; annual allowance restored when changing years; keyboard focus follows choice/save actions; manual October 4 and 29, 2027 selection retains calendar focus and correctly reports two PTO days and six days off. All 67 existing tests, TypeScript, lint and build pass after the changes.

## External prerequisites and verification limits

- **Cloudflare setup is deferred by the owner.** AI remains disabled. Create a Turnstile widget restricted to stretchbreak.netlify.app, configure its site key and protected production secret, then complete readiness and acceptance checks before enabling AI and redeploying.
- Function-only secret scopes are unavailable on the current Netlify account. Protected production-only secrets are configured using supported scopes; further scope restriction would require a plan/capability change. No plan upgrade or purchase was made.
- Production cookie issuance, trusted-IP handling, durable accounting writes and paid-provider behavior remain unverified. Existing mocks do not establish them. MFA, provider alerts, dedicated project-key permissions and any historical credential rotation require account-owner checks.
- Worldwide holiday correctness is **not certified**. Provider conformance is complete for the advertised 2026–2027 catalog; government verification covers documented samples only. Nigeria 2027 Islamic dates and employee-specific observed dates remain explicitly unconfirmed. The app must not advertise universal verified coverage.
- Free-form chat remains advisory. Guest verification is abuse resistance rather than user-account authentication. Local data/shared snapshots are not encrypted. Persistent browser-storage failure can prevent rollback and is reported explicitly.
