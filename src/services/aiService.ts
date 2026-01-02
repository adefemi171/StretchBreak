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

// Check if AI is available (Netlify Functions are always available)
export const isAIAvailable = (): boolean => {
  return true; // Netlify Functions handle API key availability server-side
};

export interface NaturalLanguageRequest {
  text: string;
  holidays: PublicHoliday[];
  year: number;
  preferences?: UserPreferences;
}

export interface ParsedRequest {
  startDate?: string;
  endDate?: string;
  duration?: number;
  month?: number;
  season?: string;
  constraints?: string[];
}

export const parseNaturalLanguage = async (
  request: NaturalLanguageRequest
): Promise<ParsedRequest> => {
  try {
    const response = await fetch(getNetlifyFunctionUrl('parse-natural-language'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        holidays: request.holidays,
        year: request.year,
        preferences: request.preferences,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.parsed as ParsedRequest;
  } catch (error) {
    console.error('Error parsing natural language:', error);
    throw error;
  }
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
    console.error('Error generating AI suggestions:', error);
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
    return data.reply || 'I apologize, I could not generate a response.';
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
};
