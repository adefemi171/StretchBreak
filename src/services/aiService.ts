import type { PublicHoliday, PlanSuggestion, UserPreferences, ChatMessage } from '../utils/types';

const getNetlifyFunctionUrl = (functionName: string): string => {
  // Relative URL works in production and via Vite proxy → netlify functions in local full-stack dev
  return `/.netlify/functions/${functionName}`;
};

let availabilityCache: boolean | null = null;
let availabilityPromise: Promise<boolean> | null = null;

const isNetworkFailure = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
};

/** Probe whether Netlify AI functions are reachable (cached). */
export const checkAIAvailability = async (): Promise<boolean> => {
  if (availabilityCache !== null) {
    return availabilityCache;
  }

  if (availabilityPromise) {
    return availabilityPromise;
  }

  availabilityPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);
      // Lightweight POST — real Netlify functions respond with JSON (even on 4xx/5xx)
      const response = await fetch(getNetlifyFunctionUrl('generate-ai-suggestions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const contentType = response.headers.get('content-type') || '';
      // Vite proxy errors are usually HTML/plain text when the function host is down
      availabilityCache =
        contentType.includes('application/json') &&
        response.status !== 502 &&
        response.status !== 503 &&
        response.status !== 504;
    } catch {
      availabilityCache = false;
    } finally {
      availabilityPromise = null;
    }
    return availabilityCache ?? false;
  })();

  return availabilityPromise;
};

export const isAIAvailable = (): boolean => {
  // Synchronous hint for UI; prefer checkAIAvailability for decisions
  return availabilityCache === true;
};

export const resetAIAvailabilityCache = (): void => {
  availabilityCache = null;
};

export const generateAISuggestions = async (
  holidays: PublicHoliday[],
  year: number,
  preferences?: UserPreferences
): Promise<PlanSuggestion[]> => {
  const available = await checkAIAvailability();
  if (!available) {
    return [];
  }

  try {
    const response = await fetch(getNetlifyFunctionUrl('generate-ai-suggestions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holidays,
        year,
        preferences,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Support both { suggestions: [...] } and legacy raw arrays
    if (Array.isArray(data)) {
      return data as PlanSuggestion[];
    }
    return (data.suggestions || []) as PlanSuggestion[];
  } catch (error) {
    if (isNetworkFailure(error)) {
      availabilityCache = false;
      return [];
    }
    throw error;
  }
};

export const chatWithAssistant = async (
  message: string,
  context: {
    holidays: PublicHoliday[];
    year: number;
    countryCode?: string;
    currentPlan?: { vacationDays: string[] };
    preferences?: UserPreferences;
    conversationHistory?: ChatMessage[];
  }
): Promise<string> => {
  const available = await checkAIAvailability();
  if (!available) {
    throw new Error(
      'AI assistant is offline. Start with `npx netlify dev` (and set OPENAI_API_KEY), or use Bridge Board and natural-language planning without AI.'
    );
  }

  try {
    const response = await fetch(getNetlifyFunctionUrl('chat-assistant'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        holidays: context.holidays,
        year: context.year,
        countryCode: context.countryCode,
        currentPlan: context.currentPlan,
        preferences: context.preferences,
        conversationHistory: context.conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || 'I apologize, I could not generate a response.';
  } catch (error) {
    if (isNetworkFailure(error)) {
      availabilityCache = false;
      throw new Error(
        'AI assistant is offline. Start with `npx netlify dev` (and set OPENAI_API_KEY), or use Bridge Board without AI.'
      );
    }
    throw error;
  }
};
