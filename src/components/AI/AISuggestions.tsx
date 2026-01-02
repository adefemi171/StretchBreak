import { useState, useEffect } from 'react';
import { generateAISuggestions } from '../../services/aiService';
import type { PublicHoliday, PlanSuggestion, UserPreferences } from '../../utils/types';
import './AISuggestions.css';

interface AISuggestionsProps {
  holidays: PublicHoliday[];
  year: number;
  preferences?: UserPreferences;
  onSuggestionSelect?: (suggestion: PlanSuggestion) => void;
}

export const AISuggestions = ({
  holidays,
  year,
  preferences,
  onSuggestionSelect,
}: AISuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (holidays.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        const aiSuggestions = await generateAISuggestions(holidays, year, preferences);
        setSuggestions(aiSuggestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AI suggestions');
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [holidays, year, preferences]);

  if (loading) {
    return <div className="ai-suggestions-loading">🤖 AI is generating suggestions...</div>;
  }

  if (error) {
    return <div className="ai-suggestions-error">⚠️ {error}</div>;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="ai-suggestions">
      <h3>🤖 AI Suggestions</h3>
      <div className="suggestions-list">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="suggestion-card"
            onClick={() => onSuggestionSelect?.(suggestion)}
          >
            <div className="suggestion-header">
              <span className="suggestion-dates">
                {new Date(suggestion.startDate).toLocaleDateString()} -{' '}
                {new Date(suggestion.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="suggestion-details">
              <span>{suggestion.vacationDaysUsed} vacation days</span>
              <span>{suggestion.totalDaysOff} total days off</span>
            </div>
            <p className="suggestion-reason">{suggestion.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

