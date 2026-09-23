// Read-only network audit. Run with Node 22+; defaults to the current and next year.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareDates, inspectFeed } from './lib/holiday-audit.mjs';

const root = resolve(import.meta.dirname, '..');
const requested = process.argv.slice(2);
const years = requested.length ? requested.map(Number) : [new Date().getUTCFullYear(), new Date().getUTCFullYear() + 1];
if (Number(process.versions.node.split('.')[0]) < 22 || years.length > 5 || years.some(y => !Number.isInteger(y) || y < 1900 || y > 2200)) {
  throw new Error('Usage: node scripts/audit-holidays.mjs [year ...] (Node 22+, at most 5 years).');
}
const base = 'https://date.nager.at/api/v3';
const startedAt = new Date().toISOString();
const fetchBounded = async url => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await new Promise(done => setTimeout(done, 1000));
        continue;
      }
      const text = await response.text();
      if (text.length > 2_000_000) throw new Error('Response exceeds the 2 MB audit limit.');
      return { response, text };
    } catch (error) { if (attempt) throw error; }
  }
};
const { response, text } = await fetchBounded(`${base}/AvailableCountries`);
if (!response.ok) throw new Error(`Country catalog failed: ${response.status}`);
const countries = JSON.parse(text);
if (!Array.isArray(countries) || countries.length > 300 || !countries.every(c => /^[A-Z]{2}$/.test(c.countryCode) && typeof c.name === 'string') || new Set(countries.map(c => c.countryCode)).size !== countries.length) {
  throw new Error('Invalid or duplicate country catalog.');
}
const cache = join(root, 'node_modules/.cache');
await mkdir(cache, { recursive: true });
const temporary = await mkdtemp(join(cache, 'holiday-audit-'));
try {
  await build({ stdin: { contents: "export * from './src/services/holidayPolicy.ts'; export * from './src/utils/holidayFilter.ts';", resolveDir: root }, outfile: join(temporary, 'policy.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
  const { normalizeHolidayFeed, applyVerifiedHolidayOverrides, filterHolidaysByRegions, HOLIDAY_POLICY_VERSION } = await import(pathToFileURL(join(temporary, 'policy.mjs')).href);
  const jobs = countries.flatMap(country => years.map(year => ({ ...country, year })));
  const results = [];
  let next = 0;
  // Four workers, two attempts and 15 s timeouts keep this bounded and polite.
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const sourceUrl = `${base}/PublicHolidays/${job.year}/${job.countryCode}`;
      const result = { ...job, sourceUrl, retrievedAt: new Date().toISOString() };
      try {
        const { response, text } = await fetchBounded(sourceUrl);
        result.httpStatus = response.status;
        result.sha256 = createHash('sha256').update(text).digest('hex');
        if ([204, 404].includes(response.status)) result.status = 'unavailable';
        else if (!response.ok) { result.status = 'http-error'; result.error = `HTTP ${response.status}`; }
        else {
          try { Object.assign(result, inspectFeed(JSON.parse(text), job.year, job.countryCode, normalizeHolidayFeed, applyVerifiedHolidayOverrides, filterHolidaysByRegions)); }
          catch (error) { result.status = 'invalid'; result.error = error.message; }
        }
      } catch (error) { result.status = 'network-error'; result.error = error.message; }
      results.push(result);
      if (results.length % 40 === 0) console.log(`Audited ${results.length}/${jobs.length} country-years`);
    }
  }));
  results.sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.year - b.year);
  const statusCounts = {};
  for (const result of results) statusCounts[result.status] = (statusCounts[result.status] ?? 0) + 1;
  const uk = JSON.parse(await readFile(join(root, 'tests/fixtures/uk-government-2026-2027.json'), 'utf8'));
  const official = JSON.parse(await readFile(join(root, 'tests/fixtures/official-holiday-expectations.json'), 'utf8'));
  const officialComparisons = [];
  // These are pinned, independently reviewed expectations, never inferred from the provider.
  // A rerun checks provider changes against them; it does not refresh government announcements.
  for (const result of results.filter(r => r.status === 'conformant')) {
    const { countryCode, year, records } = result;
    if (![2026, 2027].includes(year)) continue;
    const effective = applyVerifiedHolidayOverrides(records, year, countryCode);
    if (countryCode === 'GB') {
      for (const [jurisdiction, code] of [['england-and-wales', 'GB-ENG'], ['england-and-wales', 'GB-WLS'], ['scotland', 'GB-SCT'], ['northern-ireland', 'GB-NIR']]) {
        const expected = uk.expected[jurisdiction].filter(h => h.date.startsWith(`${year}-`)).map(h => h.date);
        officialComparisons.push({ countryCode, year, jurisdiction: code, source: uk.source, checkedAt: uk.retrievedAt, scope: uk.scope, rawDifference: compareDates(filterHolidaysByRegions(records, [code]).map(h => h.date), expected), effectiveDifference: compareDates(filterHolidaysByRegions(effective, [code]).map(h => h.date), expected) });
      }
    } else if (['NL', 'US'].includes(countryCode)) {
      const expectation = official[countryCode];
      const comparable = countryCode === 'NL' ? records : records.filter(h => h.global && h.types.some(t => ['Public', 'Bank'].includes(t)));
      officialComparisons.push({ countryCode, year, source: expectation.source, checkedAt: official.checkedOn, scope: expectation.scope, rawDifference: compareDates(comparable.map(h => h.date), expectation[year]), appNationalPublicDifference: compareDates(filterHolidaysByRegions(effective, []).map(h => h.date), expectation[year]), ...(expectation.boundaryNote ? { boundaryNote: expectation.boundaryNote } : {}) });
    }
  }
  const output = { schemaVersion: 1, startedAt, completedAt: new Date().toISOString(), years, policyVersion: HOLIDAY_POLICY_VERSION, catalogSource: `${base}/AvailableCountries`, advertisedCountryCount: countries.length, interpretation: 'Conformance validates feed shape, dates and application filtering only. It is not government verification, completeness certification or employment entitlement.', statusCounts, officialComparisons, results };
  const path = join(root, 'reports', `holiday-provider-audit-${years.join('-')}.json`);
  await mkdir(join(root, 'reports'), { recursive: true });
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ path, advertisedCountries: countries.length, checkedCountryYears: results.length, statusCounts }));
  const officialMismatch = officialComparisons.some(comparison => {
    const difference = comparison.effectiveDifference ?? comparison.rawDifference;
    return difference.missing.length || difference.additional.length;
  });
  if (officialMismatch || results.some(r => ['invalid', 'http-error', 'network-error', 'empty'].includes(r.status))) process.exitCode = 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
