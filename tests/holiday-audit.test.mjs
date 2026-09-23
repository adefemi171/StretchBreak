import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectFeed, compareDates } from '../scripts/lib/holiday-audit.mjs';
import { normalizeHolidayFeed, applyVerifiedHolidayOverrides, NIGERIA_ADHA_SOURCE, NIGERIA_MAWLID_SOURCE } from '../src/services/holidayPolicy.ts';
import { filterHolidaysByRegions } from '../src/utils/holidayFilter.ts';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const audit = read('../reports/holiday-provider-audit-2026-2027.json');
const uk = read('./fixtures/uk-government-2026-2027.json');
const official = read('./fixtures/official-holiday-expectations.json');
const records = (country, year) => audit.results.find(r => r.countryCode === country && r.year === year).records;

test('coverage snapshot checks every catalog country-year without pretending to certify dates', () => {
  assert.equal(audit.results.length, audit.advertisedCountryCount * audit.years.length);
  assert.match(audit.interpretation, /not government verification/);
  assert.equal(new Set(audit.results.map(r => `${r.countryCode}-${r.year}`)).size, audit.results.length);
  for (const result of audit.results) {
    assert.equal(result.status, 'conformant', `${result.countryCode} ${result.year}`);
    assert.equal(inspectFeed(result.records, result.year, result.countryCode, normalizeHolidayFeed, applyVerifiedHolidayOverrides, filterHolidaysByRegions).status, 'conformant');
  }
});

test('UK selected-region dates match pinned government 2026/2027 calendars after correction', () => {
  for (const year of [2026, 2027]) {
    for (const [region, code] of [['england-and-wales', 'GB-ENG'], ['england-and-wales', 'GB-WLS'], ['scotland', 'GB-SCT'], ['northern-ireland', 'GB-NIR']]) {
      const effective = applyVerifiedHolidayOverrides(records('GB', year), year, 'GB');
      const comparison = compareDates(filterHolidaysByRegions(effective, [code]).map(h => h.date), uk.expected[region].filter(h => h.date.startsWith(`${year}-`)).map(h => h.date));
      assert.deepEqual(comparison, { missing: [], additional: [] }, `${code} ${year}`);
      assert.deepEqual(applyVerifiedHolidayOverrides(effective, year, 'GB'), effective);
    }
  }
});

test('Scotland observed-date correction does not change other years or jurisdictions', () => {
  const raw = records('GB', 2027);
  assert.ok(raw.some(h => h.date === '2027-01-02' && h.counties.includes('GB-SCT')));
  assert.deepEqual(applyVerifiedHolidayOverrides(raw, 2026, 'GB'), raw);
  assert.deepEqual(applyVerifiedHolidayOverrides(raw, 2027, 'US'), raw);
  assert.deepEqual(filterHolidaysByRegions(applyVerifiedHolidayOverrides(raw, 2027, 'GB'), ['GB-ENG']), filterHolidaysByRegions(raw, ['GB-ENG']));
});

test('Dutch official dates match raw records; optional employment days remain employer-confirmed', () => {
  for (const year of [2026, 2027]) {
    const raw = records('NL', year);
    assert.deepEqual(compareDates(raw.map(h => h.date), official.NL[year]), { missing: [], additional: [] });
    assert.equal(filterHolidaysByRegions(raw, []).length, 9);
    assert.equal(raw.filter(h => !h.types.includes('Public')).length, 2);
  }
});

test('US provider Public/Bank scope matches published OPM annual schedule but Public alone is not federal employment', () => {
  for (const year of [2026, 2027]) {
    const raw = records('US', year);
    assert.deepEqual(compareDates(raw.filter(h => h.global && h.types.some(t => ['Public', 'Bank'].includes(t))).map(h => h.date), official.US[year]), { missing: [], additional: [] });
    assert.equal(compareDates(filterHolidaysByRegions(raw, []).map(h => h.date), official.US[year]).missing.length, 1);
  }
});

test('Nigeria official Adha and Mawlid replace estimates without removing unrelated same-day events', () => {
  const raw = records('NG', 2026);
  const estimates = [
    { ...raw[0], date: '2026-05-29', name: 'Id el-Kabir', localName: 'Id el-Kabir' },
    { ...raw[0], date: '2026-08-26', name: 'Id el Maulud', localName: 'Id el Maulud' },
  ];
  const corrected = applyVerifiedHolidayOverrides([...raw, ...estimates], 2026, 'NG');
  assert.deepEqual(corrected.filter(h => h.sourceUrl === NIGERIA_ADHA_SOURCE).map(h => h.date), ['2026-05-27', '2026-05-28']);
  assert.deepEqual(corrected.filter(h => h.sourceUrl === NIGERIA_MAWLID_SOURCE).map(h => h.date), ['2026-08-25']);
  assert.ok(corrected.some(h => h.name === "Children's Day"));
  assert.ok(!corrected.some(h => ['2026-05-29', '2026-08-26'].includes(h.date)));
  assert.deepEqual(applyVerifiedHolidayOverrides(corrected, 2026, 'NG'), corrected);
});

test('audit identifies empty calendars, unknown categories and ambiguous regional scope', () => {
  const holiday = records('NG', 2026)[0];
  const inspect = data => inspectFeed(data, 2026, 'NG', normalizeHolidayFeed, h => h, filterHolidaysByRegions);
  assert.equal(inspect([]).status, 'empty');
  assert.ok(inspect([{ ...holiday, types: ['NewCategory'] }]).warnings.includes('unknown-category'));
  assert.ok(inspect([{ ...holiday, global: false, counties: null }]).warnings.includes('unknown-regional-scope'));
  assert.ok(inspect([{ ...holiday, counties: ['NG-LA'] }]).warnings.includes('conflicting-national-and-regional-scope'));
});
