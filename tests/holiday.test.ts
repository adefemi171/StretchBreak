import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHolidayFeed, applyVerifiedHolidayOverrides, NIGERIA_EID_SOURCE } from '../src/services/holidayPolicy';
import { filterHolidaysByRegions } from '../src/utils/holidayFilter';
import { fetchHolidayDataset } from '../src/services/holidayApi';
import type { PublicHoliday } from '../src/utils/types';

const holiday = (fields: Partial<PublicHoliday> = {}): PublicHoliday => ({
  date: '2026-01-01', name: 'New Year', localName: 'New Year', countryCode: 'GB',
  fixed: true, global: true, counties: null, launchYear: null, types: ['Public'], ...fields,
});

test('January 1 remains in its date-only year in all host timezones', () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ['America/Chicago', 'Pacific/Honolulu', 'Pacific/Auckland', 'UTC']) {
      process.env.TZ = timezone;
      assert.deepEqual(normalizeHolidayFeed([holiday()], 2026, 'GB').map(h => h.date), ['2026-01-01']);
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test('feed contract rejects malformed dates, wrong scope, missing categories and schema changes', () => {
  for (const feed of [{ holidays: [] }, [holiday({ date: '2026-02-30' })], [holiday({ countryCode: 'US' })],
    [holiday({ date: '2025-12-31' })], [holiday({ types: [] })], [holiday({ counties: ['US-TX'] })]]) {
    assert.throws(() => normalizeHolidayFeed(feed, 2026, 'GB'));
  }
});

test('national-only is conservative; named region includes its public holidays only', () => {
  const national = holiday();
  const scotland = holiday({ date: '2026-01-02', global: false, counties: ['GB-SCT'] });
  const england = holiday({ date: '2026-04-06', global: false, counties: ['GB-ENG', 'GB-WLS'] });
  const optional = holiday({ date: '2026-02-01', types: ['Bank', 'Optional'] });
  const school = holiday({ date: '2026-03-01', types: ['School', 'Authorities', 'Observance'] });
  const unknown = holiday({ date: '2026-05-01', global: false, counties: null });
  const feed = [national, scotland, england, optional, school, unknown];
  assert.deepEqual(filterHolidaysByRegions(feed, []), [national]);
  assert.deepEqual(filterHolidaysByRegions(feed, ['GB-ENG']), [national, england]);
  assert.deepEqual(filterHolidaysByRegions(feed, ['GB-SCT']), [national, scotland]);
  assert.deepEqual(filterHolidaysByRegions(feed, ['GB-ENG'], [national.date]), [england]);
});

test('Nigeria 2026 official announcement replaces estimated Eid dates exactly once', () => {
  const feed = [holiday({ countryCode: 'NG' }), holiday({ countryCode: 'NG', date: '2026-03-21', name: 'Eid al-Fitr' })];
  const updated = applyVerifiedHolidayOverrides(feed, 2026, 'NG');
  assert.deepEqual(updated.map(h => h.date), ['2026-01-01', '2026-03-19', '2026-03-20', '2026-05-27', '2026-05-28', '2026-08-25']);
  assert.equal(updated[1].sourceUrl, NIGERIA_EID_SOURCE);
  assert.equal(updated[1].verifiedOn, '2026-09-22');
  assert.deepEqual(applyVerifiedHolidayOverrides(updated, 2026, 'NG'), updated);
  assert.deepEqual(applyVerifiedHolidayOverrides(feed, 2027, 'NG'), feed);
  assert.deepEqual(applyVerifiedHolidayOverrides(feed, 2026, 'GB'), feed);
});

test('unsupported 204 gives explicit coverage error without trying to parse JSON', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try { await assert.rejects(fetchHolidayDataset(2026, 'IN'), /coverage is unavailable/); }
  finally { globalThis.fetch = original; }
});

test('service-worker cached responses retain source age and stale status', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([holiday({ countryCode: 'CA' })]), {
    headers: { 'x-stretchbreak-fetched-at': '2026-01-01T00:00:00Z', 'x-stretchbreak-offline': 'true' },
  });
  try {
    const dataset = await fetchHolidayDataset(2026, 'CA');
    assert.equal(dataset.metadata.retrievedAt, '2026-01-01T00:00:00Z');
    assert.equal(dataset.metadata.freshness, 'stale');
    assert.equal(dataset.metadata.coverage, 'provider-unverified');
  } finally { globalThis.fetch = original; }
});
