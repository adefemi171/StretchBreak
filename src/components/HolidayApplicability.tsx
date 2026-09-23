import type { PlanningConfig, PublicHoliday } from '../utils/types';
import { filterHolidaysByRegions } from '../utils/holidayFilter';

interface Props {
  config: PlanningConfig;
  onChange: (config: PlanningConfig) => void;
  holidays: PublicHoliday[];
  countryCode: string;
}

export const HolidayApplicability = ({ config, onChange, holidays, countryCode }: Props) => {
  const applicable = filterHolidaysByRegions(holidays.filter(h => h.countryCode === countryCode), config.selectedRegions || []);
  const byDate = new Map<string, string[]>();
  applicable.forEach(h => byDate.set(h.date, [...(byDate.get(h.date) || []), h.name]));
  const excluded = config.excludedHolidayDates || [];
  return (
    <details className="holiday-applicability">
      <summary>Confirm your employer’s holidays</summary>
      <p>Uncheck public holidays you work. School, bank, optional and observance dates are excluded by default. Add any additional days your employer gives you under Company holidays.</p>
      {byDate.size ? <fieldset>
        <legend>Public holidays treated as days off</legend>
        {[...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, names]) => (
          <label key={date} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '44px' }}>
            <input type="checkbox" checked={!excluded.includes(date)} onChange={event => onChange({
              ...config,
              excludedHolidayDates: event.target.checked ? excluded.filter(d => d !== date) : [...new Set([...excluded, date])],
            })} />
            <span>{date} · {[...new Set(names)].join(' / ')}</span>
          </label>
        ))}
      </fieldset> : <p>No applicable public holidays are loaded. Choose your region or add confirmed company holidays.</p>}
    </details>
  );
};
