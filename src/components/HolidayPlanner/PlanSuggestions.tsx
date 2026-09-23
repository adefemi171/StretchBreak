import { useState, useMemo, type ReactNode } from 'react';
import type { PlanSuggestion, SuggestionFilters } from '../../utils/types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { applySuggestionFilters, getEmptyFilters } from '../../utils/suggestionFilters';
import { SuggestionFilters as SuggestionFiltersUI } from '../SuggestionFilters/SuggestionFilters';
import './PlanSuggestions.css';

interface PlanSuggestionsProps {
  suggestions: PlanSuggestion[];
  onApplySuggestion: (suggestion: PlanSuggestion) => void;
  appliedFeedback?: string | null;
  extraOptions?: ReactNode;
}

export const PlanSuggestions = ({
  suggestions,
  onApplySuggestion,
  extraOptions,
}: PlanSuggestionsProps) => {
  const [filters, setFilters] = useState<SuggestionFilters>(getEmptyFilters());

  const sortedSuggestions = useMemo(() => {
    if (suggestions.length === 0) return [];

    // Deduplicate suggestions with the same start and end dates
    const uniqueSuggestions = new Map<string, PlanSuggestion>();
    for (const suggestion of suggestions) {
      const key = `${suggestion.startDate}-${suggestion.endDate}`;
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, suggestion);
      } else {
        const existing = uniqueSuggestions.get(key)!;
        if (suggestion.efficiency > existing.efficiency) {
          uniqueSuggestions.set(key, suggestion);
        } else if (suggestion.efficiency === existing.efficiency && suggestion.reason.length > existing.reason.length) {
          uniqueSuggestions.set(key, suggestion);
        }
      }
    }

    const deduplicated = Array.from(uniqueSuggestions.values());
    return applySuggestionFilters(deduplicated, filters);
  }, [suggestions, filters]);

  return (
    <div className="plan-suggestions">
      <h3 id="break-choices-heading" tabIndex={-1}>Choose a break</h3>
      {suggestions.length > 0 && <p className="suggestions-intro">A few ways to make the most of your leave.</p>}

      {suggestions.length === 0 ? (
        <p className="no-results">No breaks fit the current allowance and timeframe. Adjust your settings or choose leave dates on the calendar.</p>
      ) : sortedSuggestions.length === 0 ? (
        <div className="no-results"><p>No breaks match these filters.</p><button type="button" className="clear-filters-btn" onClick={() => setFilters(getEmptyFilters())}>Clear filters</button></div>
      ) : (
        <div className="suggestions-list">
          {sortedSuggestions.slice(0, 3).map(suggestion => (
            <article key={`${suggestion.startDate}-${suggestion.endDate}`} className="suggestion-card">
              <h4 className="suggestion-dates">
                {formatDateDisplay(suggestion.startDate)} – {formatDateDisplay(suggestion.endDate)}
              </h4>
              <p className="suggestion-benefit">
                Use <strong>{suggestion.vacationDaysUsed} PTO {suggestion.vacationDaysUsed === 1 ? 'day' : 'days'}</strong>
                {' → get '}<strong>{suggestion.totalDaysOff} days off</strong>
              </p>
              <button
                type="button"
                className="apply-button"
                onClick={() => onApplySuggestion(suggestion)}
                aria-label={`Choose break from ${formatDateDisplay(suggestion.startDate)} to ${formatDateDisplay(suggestion.endDate)}`}
              >
                Choose this break
              </button>
            </article>
          ))}
        </div>
      )}
      {(suggestions.length > 0 || extraOptions) && (
        <details className="suggestion-filter-options">
          <summary>More options</summary>
          <div className="break-options-content">
            {suggestions.length > 0 && <SuggestionFiltersUI filters={filters} onChange={setFilters} />}
            {extraOptions}
          </div>
        </details>
      )}
    </div>
  );
};
