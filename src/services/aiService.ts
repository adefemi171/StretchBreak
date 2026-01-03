import type { PublicHoliday, PlanSuggestion, UserPreferences, ChatMessage } from '../utils/types';

// Use Netlify Functions to proxy OpenAI API calls (API key stays server-side)
const getNetlifyFunctionUrl = (functionName: string): string => {
  // In development, use local Netlify dev server
  // In production, use the deployed function URL
  if (import.meta.env.DEV) {
    return `http://localhost:8888/.netlify/functions/${functionName}`;
  }
  return `/.netlify/functions/${functionName}`;
};

export const isAIAvailable = (): boolean => {
  return true; // Netlify Functions handle API key availability server-side
};

export const generateAISuggestions = async (
  holidays: PublicHoliday[],
  year: number,
  preferences?: UserPreferences
): Promise<PlanSuggestion[]> => {
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
    return data.suggestions as PlanSuggestion[];
  } catch (error) {
    throw error;
  }
};

export const chatWithAssistant = async (
  message: string,
  context: {
    holidays: PublicHoliday[];
    year: number;
    currentPlan?: { vacationDays: string[] };
    preferences?: UserPreferences;
    conversationHistory?: ChatMessage[];
  }
): Promise<string> => {
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
    throw error;
  }
};
