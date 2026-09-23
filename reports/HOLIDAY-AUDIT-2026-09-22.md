# Holiday audit — September 22, 2026

**Every advertised provider calendar was checked; worldwide holiday correctness is not certified.** The provider advertised 204 countries and territories. All 408 country/year responses for 2026 and 2027 returned HTTP 200 and passed the same schema/date validation used by the app: 5,331 raw holiday records. No unknown category, ambiguous regional scope, exact duplicate record or empty-calendar warning was found. Thirty-four country/year datasets contain subdivisions. Six provider categories occurred: Public, Bank, School, Authorities, Optional and Observance.

The [machine-readable evidence](holiday-provider-audit-2026-2027.json) includes each URL, retrieval time, raw response SHA-256, normalized records, region/category summary and applied corrections. The raw records preserve upstream errors so regression tests can demonstrate the difference between upstream and corrected behavior. A structurally valid date can still be wrong, missing or inapplicable to an employee.

## Independent government comparisons

| Scope checked | Result | Application action |
| --- | --- | --- |
| England/Wales, Scotland, Northern Ireland; published 2026 and 2027 bank holiday dates | All compared dates match except Scotland’s 2027 January substitute. Provider returns January 2; government lists January 4. | Narrow 2027 Scotland correction, sourced and regression tested. All four selected subdivisions now match the pinned government dates. |
| Netherlands; 11 official dates each in 2026 and 2027 | All raw dates match government lists. Good Friday and Liberation Day are categorized outside Public by the provider. | Conservative employment filtering remains. UI tells users to add employer-confirmed dates and check their contract. |
| U.S.; OPM’s published annual observed federal schedules for 2026 and 2027 | All 11 dates per annual table are present when national Public **or Bank** categories are compared. Public-only defaults omit the October federal holiday. | This is a difference in employment scope, not proof that every private employer grants federal days off. UI provides specific employer-confirmation guidance. |
| U.S.; year boundary for New Year 2028 | OPM lists an observed day on December 31, 2027; provider’s 2027 response omits it. | UI explicitly tells affected users to add that employer-confirmed date. No federal-only date is silently imposed on every U.S. employee. |
| Nigeria; three specific 2026 Ministry of Interior announcements | Feed omits Eid-ul-Fitr March 19–20, Eid-ul-Adha May 27–28 and Mawlid August 25. May 27 exists under a different event name. | All five officially announced dates are added/replaced by name, with provenance; unrelated same-date records are preserved. |

Sources checked: [UK government calendar](https://www.gov.uk/bank-holidays.json), [Dutch government calendar and employment guidance](https://www.government.nl/faq/work/public-holidays-in-the-netherlands), [U.S. OPM schedule](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/), Nigerian Ministry of Interior’s [Fitr](https://interior.gov.ng/federal-government-declares-thursday-19th-and-friday-20th-march-2026-as-public-holidays-to-mark-eid-ul-fitr/), [Adha](https://interior.gov.ng/federal-government-declares-wednesday-27th-may-and-thursday-28th-may-2026-as-public-holidays-to-mark-eid-ul-adha-celebration/) and [Mawlid](https://interior.gov.ng/fg-declares-tuesday-public-holiday-as-nation-marks-eid-ul-mawlid/) announcements.

## What remains unverified

- Most countries received provider-contract checks only. Their dates have not been independently checked against government announcements. Even the sampled official calendars do not establish employee entitlement or cover later decrees.
- Nigeria’s 2027 feed omits Islamic holidays. Do not invent their dates or carry 2026 corrections forward. The UI labels 2027 incomplete and links the ministry’s announcements. Nigeria’s full 2026 calendar is also not certified: provider labels for Children’s Day and National Youth Day need employer review. The federal broadcaster [describes Children’s Day as a school holiday rather than a general public holiday](https://radionigeriaibadan.gov.ng/2022/05/27/significance-of-childrens-day/); this historical report is not a current legal declaration. Unrelated future records were not relabeled on that basis.
- Observed dates may depend on an employee’s workweek. Changing workdays does not establish an individualized legal substitute-day calendar; confirm it with the employer.
- The catalog excludes some countries, including India, UAE, Israel, Pakistan and Saudi Arabia. A successful catalog audit must not be advertised as coverage of every country in the world.
- Government fixtures are dated evidence, not a live legal feed. Recheck primary sources before release and when a country issues an exceptional announcement.

## Reproduce and maintain

Use Node 22+: `npm run audit:holidays -- 2026 2027`. The audit uses four concurrent workers, at most two attempts per URL and a 15-second request timeout. It exits unsuccessfully for invalid, empty, network-error or HTTP-error calendars; explicit unavailable coverage is recorded separately. Official comparisons use independently reviewed, pinned expectations and retain their check dates. Refreshing provider data does not pretend to refresh those primary sources.

`npm test` reruns the production validator across every stored calendar and checks official fixtures, observed-date correction, narrowly scoped/idempotent Nigerian overrides, filtering and audit-warning behavior without network access. The artifact is intentionally reviewable; update it and its official fixtures together when a new announcement is verified. Application provenance remains `provider-unverified` even for sample-checked countries.
