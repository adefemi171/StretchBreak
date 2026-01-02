import { useState } from 'react';
import { generateAISuggestions, isAIAvailable } from '../services/aiService';
import type { PublicHoliday, PlanSuggestion, UserPreferences } from '../utils/types';

export const useAI = () => {
  const [aiSuggestions, setAiSuggestions] = useState<PlanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateSuggestions = async (
    holidays: PublicHoliday[],
    year: number,
    preferences?: UserPreferences
  ) => {
    if (!isAIAvailable() || holidays.length === 0) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const suggestions = await generateAISuggestions(holidays, year, preferences);
      setAiSuggestions(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI suggestions');
      console.error('AI suggestions error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    aiSuggestions,
    loading,
    error,
    generateSuggestions,
    isAIAvailable: isAIAvailable(),
  };
};

