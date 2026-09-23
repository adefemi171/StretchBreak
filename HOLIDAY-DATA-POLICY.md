# Holiday data policy

The provider calendar is a planning input, not a certified worldwide employment calendar. A successful API response does not establish completeness or an employee’s entitlement to time off.

## Applicability

Only records categorized `Public` count automatically. National (`global: true`) records apply with no region selected. Other public holidays require a matching selected subdivision. Records with unknown regional scope are excluded. School, bank, optional and observance categories do not automatically count as days off. Employer exceptions can remove public dates; confirmed company holidays can add days off. Working weekdays are an independent personal setting.

## Date and feed contract

Dates are validated as real `YYYY-MM-DD` values in the requested year without local timezone conversion. The v3 schema, country and subdivision identifiers are validated before use. HTTP 204 and 404 mean coverage is unavailable, never an empty verified calendar. A future provider version needs a new adapter and contract tests.

## Provenance and freshness

Each dataset carries its provider URL, retrieval timestamp, freshness status, policy version and official override links. Retrieval is not government verification. Service-worker timestamps preserve the age of offline responses; offline data is marked stale, or unknown when no retrieval timestamp is available. Full calendars remain available for historical plan display; only recommendation candidates should be restricted to future dates.

## Verified exceptions

Policy version `2026-09-22.2` applies these narrowly scoped official corrections:

- Nigeria, 2026: [Eid-ul-Fitr March 19–20](https://interior.gov.ng/federal-government-declares-thursday-19th-and-friday-20th-march-2026-as-public-holidays-to-mark-eid-ul-fitr/), [Eid-ul-Adha May 27–28](https://interior.gov.ng/federal-government-declares-wednesday-27th-may-and-thursday-28th-may-2026-as-public-holidays-to-mark-eid-ul-adha-celebration/) and [Eid-ul-Mawlid August 25](https://interior.gov.ng/fg-declares-tuesday-public-holiday-as-nation-marks-eid-ul-mawlid/). Matching estimates are replaced without removing unrelated events sharing the date. This does not certify Nigeria’s full calendar or predict 2027 religious dates.
- Scotland, 2027: the provider’s January 2 record is moved to the [government-listed January 4 substitute bank holiday](https://www.gov.uk/bank-holidays). Other jurisdictions and years are unchanged.

Checked September 22, 2026. Before adding an override, record the jurisdiction, exact year, official source, check date and a regression fixture. Announcements can change; future country/year coverage requires ongoing independent verification.

## Coverage evidence and release procedure

The [September 22 audit](reports/HOLIDAY-AUDIT-2026-09-22.md) covers **all 204 countries and territories advertised by the provider for 2026 and 2027**: 408 calendars and 5,331 raw records. All passed the application’s structural contract. This is provider conformance, not an assertion that every holiday is correct. The catalog itself is not worldwide coverage: countries such as India, the UAE, Israel, Pakistan and Saudi Arabia were not advertised at this check.

Run `npm run audit:holidays -- 2026 2027` with Node 22+ and network access to regenerate `reports/holiday-provider-audit-2026-2027.json`. The script bounds concurrency, retries, response sizes and request timeouts; unavailable coverage is distinct from malformed or empty calendars. It records source URLs, timestamps, raw-response hashes, normalized records, category/region counts, overrides and differences against pinned official expectations. A successful run only establishes the documented provider contract. The normal `npm test` suite verifies the stored snapshot and corrections offline; it does not silently depend on mutable network responses.

For each release affecting holiday logic, rerun the audit, inspect differences, refresh official fixtures from their linked primary sources, and review the country notices. When checking another country, include all applicable subdivisions, observed substitute days, religious announcements, exceptional decrees and year-boundary days. Add a source-specific regression before changing production policy. Record the check date and exact scope. Changes to government announcements after a check require another review; no fixture is a perpetual certification.

Known scope limits remain explicit in the UI and audit report: Dutch employment entitlement differs from official holiday dates; the U.S. federal calendar differs from state/private-employer calendars and includes an observed date on December 31, 2027; Nigeria’s 2027 Islamic dates are absent and some provider employment categories need confirmation. Users can exclude dates they work and add employer-confirmed dates. No automatic legal entitlement claim is made.

## Saved plans

Persist the filtered holiday snapshot alongside region, employer holiday exceptions, company holidays, workdays and timeframe. Opening a plan should use its snapshot. Refreshing provider data must be deliberate so previously saved results do not silently change. Legacy plans lack some context and should not be represented as verified.
