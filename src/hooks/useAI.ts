import { useState, useEffect, useCallback, useRef } from 'react';
import { generateAISuggestions, checkAIAvailability, resetAIAvailabilityCache } from '../services/aiService';
import type { AIPlanningContext } from '../services/aiService';
import type { PublicHoliday, PlanSuggestion, UserPreferences } from '../utils/types';

export const useAI = () => {
  const [aiSuggestions, setAiSuggestions] = useState<PlanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const active = useRef<AbortController | null>(null);

  const refreshAvailability = useCallback(async () => {
    resetAIAvailabilityCache();
    const ready = await checkAIAvailability();
    setAiReady(ready);
    setAiChecked(true);
    return ready;
  }, []);
  useEffect(() => {
    let cancelled = false;
    checkAIAvailability().then((ready) => {
      if (!cancelled) { setAiReady(ready); setAiChecked(true); }
    });
    return () => { cancelled = true; active.current?.abort(); };
  }, []);
  const clearSuggestions = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setAiSuggestions([]);
    setLoading(false);
    setError(null);
  }, []);
  const generateSuggestions = useCallback(async (
    holidays: PublicHoliday[], year: number, preferences?: UserPreferences, context?: AIPlanningContext
  ) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError(null);
    setAiSuggestions([]);
    try {
      const suggestions = await generateAISuggestions(holidays, year, preferences, context, controller.signal);
      if (active.current === controller && !controller.signal.aborted) setAiSuggestions(suggestions);
    } catch (err) {
      if (active.current === controller && !controller.signal.aborted) setError(err instanceof Error ? err.message : 'AI is temporarily unavailable.');
    } finally {
      if (active.current === controller) { setLoading(false); active.current = null; }
    }
  }, []);
  return { aiSuggestions, loading, error, generateSuggestions, clearSuggestions, refreshAvailability, isAIAvailable: aiReady, aiChecked };
};
