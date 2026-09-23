export const KNOWN_TYPES = new Set(['Public', 'Bank', 'School', 'Authorities', 'Optional', 'Observance']);

/** Conformance is intentionally separate from completeness and employment entitlement. */
export function inspectFeed(raw, year, countryCode, normalize, applyOverrides, filter) {
  const normalized = normalize(raw, year, countryCode);
  const effective = applyOverrides(normalized, year, countryCode);
  const regions = [...new Set(effective.flatMap(h => h.counties ?? []))].sort();
  const categories = [...new Set(effective.flatMap(h => h.types))].sort();
  const warnings = [];
  if (!normalized.length) warnings.push('empty-calendar');
  if (categories.some(type => !KNOWN_TYPES.has(type))) warnings.push('unknown-category');
  if (effective.some(h => !h.global && !h.counties?.length)) warnings.push('unknown-regional-scope');
  if (effective.some(h => h.global && h.counties?.length)) warnings.push('conflicting-national-and-regional-scope');
  if (!filter(effective, []).length) warnings.push('no-national-public-days-select-region-or-employer-calendar');
  const identity = h => JSON.stringify([h.date, h.name, h.global, h.counties, h.types]);
  if (new Set(normalized.map(identity)).size !== normalized.length) warnings.push('duplicate-record');
  return {
    status: warnings.includes('empty-calendar') ? 'empty' : 'conformant',
    providerRecordCount: normalized.length, effectiveRecordCount: effective.length,
    nationalPublicDateCount: new Set(filter(effective, []).map(h => h.date)).size,
    categories, regions, warnings,
    overrides: effective.filter(h => h.sourceUrl).map(({ date, name, sourceUrl, verifiedOn }) => ({ date, name, sourceUrl, verifiedOn })),
    records: normalized,
  };
}

export function compareDates(actual, expected) {
  const actualSet = new Set(actual), expectedSet = new Set(expected);
  return {
    missing: [...expectedSet].filter(date => !actualSet.has(date)).sort(),
    additional: [...actualSet].filter(date => !expectedSet.has(date)).sort(),
  };
}
