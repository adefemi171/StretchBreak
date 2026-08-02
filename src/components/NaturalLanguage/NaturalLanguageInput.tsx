import { useState } from 'react';
import {
  parseNaturalLanguageRequest,
  filterSuggestionsByRequest,
  describeRequest,
} from '../../utils/naturalLanguage';
import { findOptimalVacationPeriods } from '../../utils/planningAlgorithm';
import { formatDateDisplay } from '../../utils/dateUtils';
import type { PublicHoliday, PlanSuggestion } from '../../utils/types';
import './NaturalLanguageInput.css';

interface NaturalLanguageInputProps {
  holidays: PublicHoliday[];
  year: number;
  onApplySuggestion: (suggestion: PlanSuggestion) => void;
}

const EXAMPLES = [
  'long weekend in May',
  'week in summer',
  '5 days off around Christmas',
  'short break in autumn',
];

export const NaturalLanguageInput = ({
  holidays,
  year,
  onApplySuggestion,
}: NaturalLanguageInputProps) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PlanSuggestion[]>([]);
  const [filterLabel, setFilterLabel] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = (text: string) => {
    const request = parseNaturalLanguageRequest(text);
    const all = findOptimalVacationPeriods(holidays, year);
    const filtered = filterSuggestionsByRequest(all, request).slice(0, 5);
    setMatches(filtered);
    setFilterLabel(describeRequest(request));
    setSearched(true);
  };

  return (
    <section className="nl-input" aria-label="Natural language planning">
      <div className="nl-header">
        <h3>Describe your break</h3>
        <p className="nl-subtitle">
          Plain English works here — runs locally on public holidays, no AI key needed.
        </p>
      </div>

      <form
        className="nl-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) runSearch(query);
        }}
      >
        <input
          type="text"
          className="nl-field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "long weekend in May" or "week in summer"'
          aria-label="Describe the vacation you want"
        />
        <button type="submit" className="nl-submit" disabled={!query.trim() || holidays.length === 0}>
          Find breaks
        </button>
      </form>

      <div className="nl-examples">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="nl-chip"
            onClick={() => {
              setQuery(example);
              runSearch(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {searched && (
        <div className="nl-results">
          <p className="nl-results-label">
            {matches.length > 0
              ? `Matches for ${filterLabel}`
              : `No upcoming matches for ${filterLabel}. Try another season or fewer PTO days.`}
          </p>
          <div className="nl-results-list">
            {matches.map((suggestion) => (
              <div key={`${suggestion.startDate}-${suggestion.endDate}`} className="nl-result">
                <div>
                  <strong>
                    {formatDateDisplay(suggestion.startDate)} – {formatDateDisplay(suggestion.endDate)}
                  </strong>
                  <span>
                    {suggestion.vacationDaysUsed} PTO → {suggestion.totalDaysOff} off ·{' '}
                    {suggestion.efficiency.toFixed(1)}×
                  </span>
                  <em>{suggestion.reason}</em>
                </div>
                <button type="button" onClick={() => onApplySuggestion(suggestion)}>
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
