import type { PublicHoliday, PlanSuggestion, UserPreferences, ChatMessage } from '../utils/types';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

let openaiClient: any = null;
let openaiModule: any = null;

// Lazy load OpenAI module
export const getOpenAI = async () => {
  if (openaiClient) {
    return openaiClient;
  }
  
  if (!apiKey) {
    return null;
  }
  
  try {
    if (!openaiModule) {
      openaiModule = await import('openai');
    }
    
    const OpenAI = openaiModule.default;
    if (OpenAI && !openaiClient) {
      openaiClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
    
    return openaiClient;
  } catch (error) {
    console.warn('OpenAI module not available:', error);
    return null;
  }
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
  const openai = await getOpenAI();
  
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }
  
  const holidaysList = request.holidays
    .map(h => `${h.date}: ${h.localName}`)
    .join('\n');
  
  const prompt = `You are a holiday planning assistant. Parse the following user request and extract relevant information.

User request: "${request.text}"
Year: ${request.year}
Available public holidays:
${holidaysList}

Extract:
- Start date (if mentioned, format as YYYY-MM-DD)
- End date (if mentioned, format as YYYY-MM-DD)
- Duration in days (if mentioned)
- Month number (1-12, if mentioned like "summer", "winter", "Christmas", etc.)
- Season (summer, winter, spring, fall, or specific like "around Christmas")
- Any constraints

Return ONLY valid JSON in this format:
{
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "duration": number or null,
  "month": number (1-12) or null,
  "season": string or null,
  "constraints": string[] or []
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses natural language requests into structured JSON. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }
    
    return JSON.parse(jsonMatch[0]) as ParsedRequest;
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
  const openai = await getOpenAI();
  
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }
  
  const holidaysList = holidays
    .map(h => `${h.date}: ${h.localName} (${new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })})`)
    .join('\n');
  
  const preferencesText = preferences
    ? `User preferences:
- Preferred months: ${preferences.preferredMonths.join(', ')}
- Typical duration: ${preferences.typicalDuration} days
- Efficiency goal: ${preferences.efficiencyGoal.toFixed(2)}`
    : 'No user preferences available';
  
  const prompt = `You are an expert holiday planner. Analyze the public holidays and suggest optimal vacation periods.

Year: ${year}
Public holidays:
${holidaysList}

${preferencesText}

Suggest 3-5 optimal vacation periods that maximize days off while minimizing vacation days used. Consider:
- Bridge opportunities (e.g., take Mon-Wed before Thu-Fri holidays)
- User preferences if available
- Efficiency (total days off / vacation days used)

For each suggestion, provide:
- Start date (YYYY-MM-DD)
- End date (YYYY-MM-DD)
- Vacation days used (count)
- Total days off (including weekends and holidays)
- Efficiency ratio
- Brief reason

Return ONLY valid JSON array:
[
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "vacationDaysUsed": number,
    "totalDaysOff": number,
    "efficiency": number,
    "reason": "string",
    "publicHolidaysIncluded": [{"date": "YYYY-MM-DD", "localName": "string"}]
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful holiday planning assistant. Always return valid JSON arrays only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }
    
    return JSON.parse(jsonMatch[0]) as PlanSuggestion[];
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
  const openai = await getOpenAI();
  
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }
  
  const holidaysList = context.holidays
    .slice(0, 10)
    .map(h => `${h.date}: ${h.localName}`)
    .join('\n');
  
  const systemPrompt = `You are a helpful holiday planning assistant. Help users plan their vacations around public holidays.

Current year: ${context.year}
Public holidays (sample): ${holidaysList}
${context.currentPlan ? `Current plan: ${context.currentPlan.vacationDays.length} vacation days selected` : ''}
${context.preferences ? `User preferences: prefers ${context.preferences.preferredMonths.length > 0 ? 'months ' + context.preferences.preferredMonths.join(', ') : 'various months'}` : ''}

Provide helpful, concise responses. Suggest optimal vacation periods, explain efficiency, and help users maximize their time off.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];
  
  // Add conversation history
  if (context.conversationHistory) {
    context.conversationHistory.slice(-6).forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });
  }
  
  messages.push({ role: 'user', content: message });
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });
    
    return completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
};

export const isAIAvailable = (): boolean => {
  return apiKey !== undefined && apiKey !== '';
};
