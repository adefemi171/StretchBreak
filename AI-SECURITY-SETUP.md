# AI deployment setup

AI is disabled by default and fails closed if configuration, access verification, or shared accounting is unavailable. The deterministic planner remains usable. Current deployment progress and any account configuration blockers are recorded in [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md).

## Enable guest AI deliberately

1. Use a dedicated OpenAI production project and restricted API key. Enable MFA on OpenAI, Netlify, source control and Cloudflare accounts; keep development keys separate. Set provider spending alerts and review usage regularly.
2. Create a Cloudflare Turnstile widget limited to your exact production hostname(s). Set server environment variables `TURNSTILE_SITE_KEY` (public widget key) and `TURNSTILE_SECRET_KEY` (secret). Do not enable arbitrary hostnames. The server verifies the `ai-access` action and requesting hostname with Siteverify.
3. Set `AI_SESSION_SECRET` to at least 32 random bytes, stored as a server secret. Set `ALLOWED_ORIGINS` to exact HTTPS origins, comma separated. No wildcards, paths, or localhost in production. Never prefix server secrets with `VITE_`. Mark provider, signing and Turnstile secrets as **Contains secret values**, restrict their values to the production deploy context, and use the Functions scope when the account supports it. The linked account supports protected secrets but not custom scopes: its provider and signing secrets now use Netlify's supported secret scopes (Builds, Functions and Runtime, excluding Post processing). Restrict access to production builds as well as runtime. Leave AI disabled in public deploy previews. Site-wide Blobs data is shared across deploy contexts, so use a separate Netlify site and keys for staging if you need to test live AI there.
4. Ensure Netlify Blobs is available to the functions. The `ai-usage` store uses strong reads and conditional writes. No in-memory fallback exists. Existing monthly spend from the previous ledger format is preserved when writing the new format.
5. Set `AI_MONTHLY_COST_LIMIT_USD` (default $10), then explicitly set `AI_ENABLED=true` once verification is complete. To turn off access, set it to `false` and redeploy; Netlify function environment changes do not update an already published deployment. Rotate the signing secret and redeploy to invalidate all guest sessions.
6. CSP must permit `https://challenges.cloudflare.com` in `script-src`, `frame-src`, and `connect-src`. Deploy the functions and browser changes together. Do not cache function responses or cookies in a CDN/service worker.
7. Before enabling production traffic, run the checks below. Also verify the deployed Netlify edge overwrites `x-nf-client-connection-ip`, issued cookies are Secure/HttpOnly/SameSite=Strict, and an unavailable Blobs store returns 503 without making an OpenAI call. A readiness ping reads the ledger; it does **not** test a conditional write or prove IP-header integrity. These deployment properties cannot be established by local mocks.

For local full-stack development, use Netlify Dev with its Blobs environment and Cloudflare test keys. Local origins/cookies and test widget keys are allowed only when `NETLIFY_DEV=true` and `CONTEXT` is `dev` or absent. There is no paid-call authentication bypass for local development. Hosted requests reject placeholder credentials, weak signing secrets, test widget keys, malformed origin lists and explicit preview/branch contexts before accessing storage or the provider. Netlify Functions may omit `CONTEXT`, so production-only secret values remain the deployment isolation boundary; the context check alone cannot establish it.

## Repeatable checks

Use Node.js 22 or newer. From the repository root, validate a local environment without printing its values:

```sh
node --env-file=.env scripts/check-ai-config.mjs --allow-disabled
```

This checks all required settings while `AI_ENABLED=false`; omit `--allow-disabled` when checking an enabled configuration. An existing environment variable takes precedence over the env file. The script never prints keys, tokens, origins or server responses. It rejects obvious placeholder/test keys, weak signing secrets, unsafe origins and secret-like `VITE_` variables. It cannot establish randomness, account ownership, validity of credentials or configured widget hostname restrictions. Do not pass secret values as command-line arguments or paste the environment file into chat.

After deploying, test the actual hostname users visit:

```sh
node scripts/check-deployment.mjs https://your-production-hostname --expect-ai=ready
```

Use `--expect-ai=disabled` for a deliberately disabled rollout; `--expect-ai=either` is diagnostic only. The smoke test checks static security headers/CSP, exact credentialed CORS, no-store responses, foreign-origin rejection, readiness and unauthenticated access on all four functions. It sends no session cookies, challenge tokens, prompts or valid generation input and does not request paid generation. Exit status is 0 for the requested state passing, 1 for failed checks and 2 for invalid arguments. It refuses redirects, including a www/apex redirect; run against the canonical origin in `ALLOWED_ORIGINS`.

`read-ready` means configuration and a ledger **read** succeeded. `unavailable` is the intentionally generic 503 and cannot distinguish an off switch, missing settings or storage failure. An exhausted budget fails `--expect-ai=ready`. A passing disabled check confirms denial, not the reason for denial.

The remaining deployment acceptance checks require the real accounts and browser:

1. Complete the real Turnstile challenge on the configured hostname without requesting AI generation. Confirm that only successful verification issues the `__Host-stretchbreak-ai` cookie with HttpOnly, Secure, SameSite=Strict and Path=/. This exercises a real conditional accounting write for the challenge limiter; do not copy the cookie into logs or tickets.
2. Verify the connection identity behavior in the actual Netlify edge environment before relying on IP quotas. Netlify identifies `x-nf-client-connection-ip` as the connecting IP; local tests or HTTP responses do not prove that spoofed client values are overwritten. Do not add a public IP-echo or secret-debug endpoint to production for this purpose.
3. Exercise storage-unavailable behavior in an isolated staging site with test keys, not by removing the production ledger. Confirm failure happens before any provider request. Existing unit tests cover this branch and conditional-write contention using mocked stores.
4. Confirm MFA, restricted project keys, hostname restrictions and provider billing alerts in the account dashboards. The repository cannot enable or attest to these account controls. Revoke any previous exposed keys/webhook credentials through their issuing service.

Live AI activation requires an owned Netlify site, a funded OpenAI API project/key and a Cloudflare Turnstile widget/key pair restricted to that site's hostname. Login/account creation and secret provisioning are external prerequisites; placeholder credentials cannot substitute for them. Keep `AI_ENABLED=false` until those controls and deployment checks are complete.

For the current StretchBreak release, the session secret and protected production provider key are configured. Cloudflare setup was explicitly deferred by the owner on September 23, 2026. When ready, add the widget site key and protected production secret for `stretchbreak.netlify.app`, then complete the acceptance checks above before enabling AI traffic. MFA, billing alerts and rotation of any historically exposed provider key still require account-owner verification.

## Limits and accounting

- A verified anonymous session lasts 30 minutes and is bound to a keyed hash of the platform connection IP. Its signed cookie is HttpOnly; production uses the `__Host-` prefix, Secure, SameSite=Strict and Path=/.
- All three paid endpoints share atomic limits: 3 requests per minute per IP, 30 per day per IP, 10 per session, and 2 concurrent calls per IP. Verification is limited to 5 attempts per 10 minutes per IP. IP addresses are not persisted in plaintext or logged. Daily limits use rolling windows in the monthly ledger; a new UTC month starts a new ledger.
- Calls reserve a conservative cost ceiling before contacting OpenAI. Successful calls with complete usage settle the reservation against usage. Timeouts, missing usage, uncertain outcomes, and failed accounting keep the full reservation charged; they never free funds silently. A reservation captures its original month so a completion across midnight settles the correct ledger.
- OpenAI requests have a 20-second timeout and no automatic retries. Client calls have a 30-second timeout; abandoning a browser request cannot guarantee upstream cancellation or a refund.
- Model and price constants are server-owned. This implementation uses `gpt-4o-mini` with bounded context/output, a $0.02 per-call reservation, and input/output accounting rates of $0.15/$0.60 per million tokens. Those rates match the [official model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini), checked September 22, 2026. Recheck rates and the reservation ceiling before enabling or changing models. Provider billing is authoritative. External spending under the same key/project is outside the app ledger.
- Shared-IP users may exhaust each other's limits. Guest verification is abuse resistance, not account authentication. Determined attackers can distribute traffic or solve challenges; the global budget limits exposure. Add edge/WAF limits for infrastructure abuse. An account-based product should replace guest identity with verified user sessions and per-account quotas.

## Data and output boundaries

Public holidays are retrieved server-side from a fixed Nager.Date endpoint, normalized using the same holiday policy as the browser, and filtered to public holidays in the chosen region and explicit date exclusions. Employer dates remain user-supplied assumptions. The server computes today's date using the browser's validated timezone, constructs bounded vacation candidates and calculates their PTO, duration and efficiency. Structured Outputs returns only known candidate IDs; duplicate, unknown or malformed selections are rejected. Model-generated dates and counts cannot enter suggestions. The app applies its remaining carryover and saved-plan constraints again before showing AI suggestions.

Chat receives bounded planning context and history as user data, never interpolated into system instructions. It has no action-taking tools. Its free-form advice can still be incorrect or influenced by user content and should not be treated as verified arithmetic. Out-of-office output is a draft and uses a return-date placeholder instead of inventing a next workday. The UI discloses OpenAI and Cloudflare use; prompts may contain the user's selected company holidays and chat messages. Do not enter sensitive data. The server logs only failure category/context, not prompts, IPs, tokens or provider error bodies.

AI is requested explicitly. Region/date/PTO changes cancel or invalidate pending client suggestions. Server requests already sent may still incur charges. An expired session requires access verification again.

## Validation and references

`tests/ai-security.test.js` exercises signature tampering, expiry/IP binding, challenge action/hostname, production origin rules, UTF-8 body limits, disabled/unconfigured readiness, failed shared storage, CAS contention and races, shared budget/concurrency, legacy accounting, holiday filtering and strict candidate selection. Tests use mocked stores/feeds and make no paid calls. Run with the repository test script.

Official implementation references: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Cloudflare server-side token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Structured Outputs constrain shape; the independent candidate lookup constrains planner semantics.

[Netlify environment-variable scopes](https://docs.netlify.com/build/environment-variables/overview/) and [Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller/) describe the distinct scope and protected-secret capabilities. [Function environment variables](https://docs.netlify.com/build/functions/environment-variables/) documents runtime variable availability and the need to redeploy after changing settings.

[Netlify Blobs documentation](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) documents strong reads and `onlyIfMatch`/`onlyIfNew` writes returning `modified`; these are the contracts used by the ledger. [Netlify's connection-header clarification](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665) identifies the supported connecting-IP header. `tests/deployment-checks.test.mjs` checks that the new preflight tools distinguish ready/unavailable states, reject unsafe responses and keep secret values out of reports.
