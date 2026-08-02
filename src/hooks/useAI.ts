import { useState, useEffect, useCallback } from 'react';
import { generateAISuggestions, checkAIAvailability } from '../services/aiService';
import type { PublicHoliday, PlanSuggestion, UserPreferences } from '../utils/types';

export const useAI = () => {
  const [aiSuggestions, setAiSuggestions] = useState<PlanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkAIAvailability().then((ready) => {
      if (!cancelled) {
        setAiReady(ready);
        setAiChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const generateSuggestions = useCallback(async (
    holidays: PublicHoliday[],
    year: number,
    preferences?: UserPreferences
  ) => {
    if (holidays.length === 0) {
      return;
    }

    const ready = await checkAIAvailability();
    setAiReady(ready);
    setAiChecked(true);

    if (!ready) {
      setAiSuggestions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const suggestions = await generateAISuggestions(holidays, year, preferences);
      setAiSuggestions(suggestions);
    } catch (err) {
      // Soft-fail network / offline — algorithmic suggestions still work
      const message = err instanceof Error ? err.message : 'Failed to generate AI suggestions';
      const isOffline =
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('offline');
      if (isOffline) {
        setAiReady(false);
        setError(null);
      } else {
        setError(message);
      }
      setAiSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    aiSuggestions,
    loading,
    error,
    generateSuggestions,
    isAIAvailable: aiReady,
    aiChecked,
  };
};
