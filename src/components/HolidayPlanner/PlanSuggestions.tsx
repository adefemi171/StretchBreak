import type { PlanSuggestion } from '../../utils/types';
import { formatDateDisplay, parseDateString } from '../../utils/dateUtils';
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
  if (suggestions.length === 0) {
    return (
      <div className="plan-suggestions empty">
        <p>No suggestions available. Try selecting a country and year.</p>
      </div>
    );
  }
  
  // Sort suggestions chronologically by start date
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const dateA = parseDateString(a.startDate);
    const dateB = parseDateString(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
  
  return (
    <div className="plan-suggestions">
      <h3>Optimal Vacation Suggestions</h3>
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
    </div>
  );
};

