import type { HolidaySourceMetadata, PublicHoliday } from '../utils/types';

interface Props {
  metadataByYear: Map<number, HolidaySourceMetadata>;
  holidays: PublicHoliday[];
  selectedRegions?: string[];
}

export const HolidayDataNotice = ({ metadataByYear, holidays, selectedRegions = [] }: Props) => {
  const sources = [...metadataByYear.entries()];
  const stale = sources.some(([, source]) => source.freshness !== 'fresh');
  const nationalOnly = !selectedRegions.length && holidays.some(h => !h.global && h.counties?.length);
  const countryCode = holidays[0]?.countryCode;
  const has2027 = metadataByYear.has(2027);
  const incompleteFutureCalendar = countryCode === 'NG' && has2027;
  return (
    <aside className="holiday-data-notice" aria-label="Holiday coverage and source" style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
      {stale && <p role="status"><strong>Holiday data may be out of date.</strong> Check the source before booking.</p>}
      <details>
        <summary style={{ cursor: 'pointer', padding: '0.5rem 0' }}>Holiday coverage: provider data · confirm employer days{nationalOnly ? ' · national only' : ''}{incompleteFutureCalendar ? ' · 2027 dates incomplete' : ''}</summary>
        <p>Only public holidays for your selected region count as days off. Confirm your employer’s calendar; add company days off or exclude dates you work.</p>
        {nationalOnly && <p>Select a work region to include regional holidays.</p>}
        {countryCode === 'NG' && <p>Nigeria: the provider omits Islamic holiday dates. Official 2026 Eid announcements are applied; 2027 dates remain unconfirmed. Review Children’s Day and National Youth Day with your employer before treating them as leave-free days. Check <a href="https://interior.gov.ng/category/public-holiday/" target="_blank" rel="noreferrer">Ministry of Interior announcements</a> and add confirmed company days.</p>}
        {countryCode === 'NL' && <p>Netherlands: Good Friday and Liberation Day appear in the official calendar but are not automatically counted by this provider’s employment categories. All holiday time off depends on your contract or collective agreement. Add employer-confirmed dates. <a href="https://www.government.nl/faq/work/public-holidays-in-the-netherlands" target="_blank" rel="noreferrer">Government guidance</a>.</p>}
        {countryCode === 'US' && <p>United States: federal, state and employer calendars differ. Confirm the October federal holiday with your employer.{has2027 ? ' For employees observing the federal schedule, also add December 31, 2027 (New Year’s Day observed); the provider’s 2027 feed omits it.' : ''} Alternative workweeks can have different observed dates. <a href="https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/" target="_blank" rel="noreferrer">Federal schedule</a>.</p>}
        {sources.map(([year, source]) => (
          <p key={year}>
            {year}: <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.provider}</a>
            {' · '}{source.retrievedAt ? `Retrieved ${new Date(source.retrievedAt).toLocaleString()}` : 'Retrieval date unknown'}
            {source.freshness !== 'fresh' && <strong> · {source.freshness === 'stale' ? 'Cached data may be out of date' : 'Freshness unknown'}</strong>}
            {' · '}This calendar has not been fully verified against government announcements.
            {source.overrideSources.map(url => <span key={url}>{' '}<a href={url} target="_blank" rel="noreferrer">Verified announcement applied</a>.</span>)}
          </p>
        ))}
      </details>
    </aside>
  );
};
