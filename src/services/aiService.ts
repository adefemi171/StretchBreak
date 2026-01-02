import type { PublicHoliday, PlanSuggestion, UserPreferences, ChatMessage } from '../utils/types';

// Netlify Functions base URL
// When using netlify dev, functions are proxied to the same origin
// In production, functions are at /.netlify/functions
const getApiBaseUrl = () => {
  // In netlify dev, functions are available at /.netlify/functions
  // The dev server automatically proxies these requests
  return '/.netlify/functions';
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
    const response = await fetch(`${getApiBaseUrl()}/parse-natural-language`, {
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse natural language');
    }

    return await response.json() as ParsedRequest;
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
    const response = await fetch(`${getApiBaseUrl()}/generate-ai-suggestions`, {
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate AI suggestions');
    }

    return await response.json() as PlanSuggestion[];
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
    const response = await fetch(`${getApiBaseUrl()}/chat-assistant`, {
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to get chat response');
    }

    const data = await response.json();
    return data.response || 'I apologize, I could not generate a response.';
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
};

export const isAIAvailable = (): boolean => {
  // Check if Netlify Functions are available (API key is stored server-side)
  // In production, we assume functions are configured if the app is deployed
  // In development, we can check if netlify dev is running
  return true; // Functions will return an error if API key is not configured
};
