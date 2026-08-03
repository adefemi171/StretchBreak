import { useState, useMemo } from 'react';
import type { PlanSuggestion, SuggestionFilters } from '../../utils/types';
import { formatDateDisplay, parseDateString } from '../../utils/dateUtils';
import { applySuggestionFilters, getEmptyFilters } from '../../utils/suggestionFilters';
import { SuggestionFilters as SuggestionFiltersUI } from '../SuggestionFilters/SuggestionFilters';
import './PlanSuggestions.css';

interface PlanSuggestionsProps {
  suggestions: PlanSuggestion[];
  onApplySuggestion: (suggestion: PlanSuggestion) => void;
  appliedFeedback?: string | null;
}

export const PlanSuggestions = ({
  suggestions,
  onApplySuggestion,
  appliedFeedback,
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

  if (suggestions.length === 0) {
    return (
      <div className="plan-suggestions empty">
        <p>No suggestions available. Try selecting a country and year.</p>
      </div>
    );
  }
  
  return (
    <div className="plan-suggestions">
      <h3>Optimal Vacation Suggestions</h3>
      
      <SuggestionFiltersUI filters={filters} onChange={setFilters} />

      {sortedSuggestions.length === 0 ? (
        <p className="no-results">No suggestions match the current filters.</p>
      ) : (
        <div className="suggestions-list">
        {sortedSuggestions.map((suggestion, index) => (
          <div key={index} className="suggestion-card">
            <div className="suggestion-header">
              <span className="suggestion-rank">#{index + 1}</span>
              <span className="suggestion-dates">
                {formatDateDisplay(suggestion.startDate)} - {formatDateDisplay(suggestion.endDate)}
              </span>
            </div>
            <div className="suggestion-details">
              <div className="detail-item">
                <span className="label">Vacation Days:</span>
                <span className="value">{suggestion.vacationDaysUsed}</span>
              </div>
              <div className="detail-item">
                <span className="label">Total Days Off:</span>
                <span className="value">{suggestion.totalDaysOff}</span>
              </div>
            </div>
            <p className="suggestion-reason">{suggestion.reason}</p>
            <button
              type="button"
              className={`apply-button ${appliedFeedback ? 'applied' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplySuggestion(suggestion);
              }}
            >
              {appliedFeedback || 'Apply This Plan'}
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

