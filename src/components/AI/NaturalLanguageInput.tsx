import { useState } from 'react';
import { parseNaturalLanguage } from '../../services/aiService';
import type { PublicHoliday, UserPreferences } from '../../utils/types';
import './NaturalLanguageInput.css';

interface NaturalLanguageInputProps {
  holidays: PublicHoliday[];
  year: number;
  preferences?: UserPreferences;
  onParseSuccess: (parsed: any) => void;
  onError: (error: string) => void;
}

export const NaturalLanguageInput = ({
  holidays,
  year,
  preferences,
  onParseSuccess,
  onError,
}: NaturalLanguageInputProps) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      const parsed = await parseNaturalLanguage({
        text: input,
        holidays,
        year,
        preferences,
      });
      onParseSuccess(parsed);
      setInput('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to parse request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="natural-language-input">
      <form onSubmit={handleSubmit}>
        <label htmlFor="nl-input">Describe your vacation plans in natural language:</label>
        <div className="input-group">
          <input
            id="nl-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 'I want a week off in summer' or 'Plan around Christmas'"
            disabled={loading}
            className="nl-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="nl-submit">
            {loading ? 'Processing...' : 'Parse'}
          </button>
        </div>
      </form>
    </div>
  );
};

