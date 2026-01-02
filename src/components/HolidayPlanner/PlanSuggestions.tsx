import type { PlanSuggestion } from '../../utils/types';
import { formatDateDisplay, parseDateString } from '../../utils/dateUtils';
import './PlanSuggestions.css';

interface PlanSuggestionsProps {
  suggestions: PlanSuggestion[];
  onApplySuggestion: (suggestion: PlanSuggestion) => void;
}

export const PlanSuggestions = ({
  suggestions,
  onApplySuggestion,
}: PlanSuggestionsProps) => {
  console.log('PlanSuggestions rendered with', suggestions.length, 'suggestions');
  console.log('onApplySuggestion prop:', typeof onApplySuggestion);
  
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
  
  const handleButtonClick = (suggestion: PlanSuggestion, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== BUTTON CLICKED ===');
    console.log('Event:', e);
    console.log('Suggestion:', suggestion);
    console.log('onApplySuggestion function:', onApplySuggestion);
    
    try {
      onApplySuggestion(suggestion);
      console.log('onApplySuggestion called successfully');
    } catch (error) {
      console.error('Error calling onApplySuggestion:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

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
              className="apply-button"
              onClick={(e) => handleButtonClick(suggestion, e)}
              onMouseDown={(e) => {
                console.log('Button mouse down');
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                console.log('Button mouse up');
                e.stopPropagation();
              }}
            >
              Apply This Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

