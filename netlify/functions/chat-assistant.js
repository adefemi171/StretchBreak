import { OpenAI } from 'openai';
import {
  guardAIRequest,
  jsonResponse,
  recordUsage,
  sanitizeUserText,
  sanitizeHistory,
  PROMPT_HARDENING,
  MAX_MESSAGE_CHARS,
} from './_shared/aiGuard.js';
import { localDateString, upcomingHolidays } from './_shared/holidayDates.js';

const MODEL = 'gpt-3.5-turbo';

export const handler = async (event) => {
  const blocked = await guardAIRequest(event);
  if (blocked) return blocked;

  const { body, cors } = event._aiGuard;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'OpenAI API key not configured' }, cors);
  }

  try {
    const message = sanitizeUserText(body.message, MAX_MESSAGE_CHARS);
    if (!message.trim()) {
      return jsonResponse(400, { error: 'Message is required' }, cors);
    }

    const today = localDateString();
    const year = Number.isFinite(body.year) ? body.year : new Date().getFullYear();
    const countryCode = sanitizeUserText(String(body.countryCode || ''), 8);
    // Prefer upcoming holidays — never feed the model only early-year past dates
    const holidays = upcomingHolidays(body.holidays, { limit: 20, today });
    const currentPlan = body.currentPlan;
    const preferences = body.preferences;
    const conversationHistory = sanitizeHistory(body.conversationHistory);

    const openai = new OpenAI({ apiKey });

    const holidaysList = holidays
      .map((h) => `${sanitizeUserText(String(h?.date || ''), 32)}: ${sanitizeUserText(String(h?.localName || ''), 80)}`)
      .join('\n');

    const preferredMonths =
      preferences?.preferredMonths && Array.isArray(preferences.preferredMonths)
        ? preferences.preferredMonths.slice(0, 12).map((m) => Number(m)).filter(Number.isFinite)
        : [];

    const remainingInYear = year === new Date().getFullYear();
    const nextYearHint = remainingInYear
      ? `If few or no useful holidays remain after ${today} in ${year}, suggest planning into ${year + 1} and say so clearly.`
      : '';

    const systemPrompt = `${PROMPT_HARDENING}

You help users plan vacations around public holidays.

Today's date: ${today}
Planning year: ${year}
${countryCode ? `Country: ${countryCode}` : ''}
Upcoming public holidays (on or after today only):
${holidaysList || 'None remaining this year from the provided list'}
${currentPlan && Array.isArray(currentPlan.vacationDays) ? `Current plan: ${Math.min(currentPlan.vacationDays.length, 365)} vacation days selected` : ''}
${preferredMonths.length > 0 ? `User prefers months: ${preferredMonths.join(', ')}` : ''}

Hard rules:
- NEVER suggest vacation dates that start before today (${today}). Past holidays are out of scope.
- Only recommend future bridge days / breaks using holidays on or after ${today}.
- ${nextYearHint || 'Stay within the planning year unless the user asks otherwise.'}
- If the user asks about "this year" and remaining options are weak, say what is left and offer next year's strongest bridges.

Provide helpful, concise responses. Suggest optimal vacation periods, explain efficiency, and help users maximize their time off.`;

    const messages = [{ role: 'system', content: systemPrompt }];
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const usage = completion.usage || {};
    await recordUsage({
      model: MODEL,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
    });

    const response =
      sanitizeUserText(completion.choices[0]?.message?.content || '', 8000) ||
      'I apologize, I could not generate a response.';

    return jsonResponse(200, { response }, cors);
  } catch (error) {
    return jsonResponse(500, { error: error.message || 'Internal server error' }, cors);
  }
};
