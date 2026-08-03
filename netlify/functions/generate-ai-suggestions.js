import { OpenAI } from 'openai';
import {
  guardAIRequest,
  jsonResponse,
  reserveSpend,
  commitUsage,
  releaseReservation,
  sanitizeUserText,
  PROMPT_HARDENING,
  safeErrorResponse,
  logServerError,
} from './_shared/aiGuard.js';
import { localDateString, upcomingHolidays } from './_shared/holidayDates.js';

const MODEL = 'gpt-3.5-turbo';

export const handler = async (event) => {
  const blocked = await guardAIRequest(event);
  if (blocked) return blocked;

  const { body, cors } = event._aiGuard;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'AI is not configured' }, cors);
  }

  let reservedUsd = 0;

  try {
    const today = localDateString();
    const year = Number.isFinite(body.year) ? body.year : new Date().getFullYear();
    const holidays = upcomingHolidays(body.holidays, { limit: 40, today });
    const preferences = body.preferences;

    if (holidays.length === 0) {
      return jsonResponse(400, { error: 'Holidays are required' }, cors);
    }

    const reservation = await reserveSpend(MODEL);
    if (!reservation.ok) {
      return jsonResponse(
        429,
        {
          error: `Monthly AI cost limit of $${reservation.limitUsd.toFixed(2)} reached. Try again next month or raise AI_MONTHLY_COST_LIMIT_USD.`,
          code: 'AI_COST_LIMIT',
          spentUsd: Number(reservation.spentUsd.toFixed(4)),
          limitUsd: reservation.limitUsd,
        },
        cors
      );
    }
    reservedUsd = reservation.reservedUsd;

    const openai = new OpenAI({ apiKey });

    const holidaysList = holidays
      .map((h) => {
        const date = sanitizeUserText(String(h?.date || ''), 32);
        const name = sanitizeUserText(String(h?.localName || ''), 80);
        let weekday = '';
        try {
          const [y, m, d] = date.split('-').map(Number);
          weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
        } catch {
          weekday = '';
        }
        return `${date}: ${name}${weekday ? ` (${weekday})` : ''}`;
      })
      .join('\n');

    const preferredMonths =
      preferences?.preferredMonths && Array.isArray(preferences.preferredMonths)
        ? preferences.preferredMonths.slice(0, 12).map((m) => Number(m)).filter(Number.isFinite)
        : [];
    const typicalDuration =
      typeof preferences?.typicalDuration === 'number' ? preferences.typicalDuration : null;
    const efficiencyGoal =
      typeof preferences?.efficiencyGoal === 'number' ? preferences.efficiencyGoal : null;

    const preferencesText = preferences
      ? `User preferences:
- Preferred months: ${preferredMonths.join(', ') || 'none'}
- Typical duration: ${typicalDuration ?? 'n/a'} days
- Efficiency goal: ${efficiencyGoal != null ? efficiencyGoal.toFixed(2) : 'n/a'}`
      : 'No user preferences available';

    const prompt = `Analyze upcoming public holidays and suggest optimal vacation periods.

Today's date: ${today}
Planning year: ${year}
Upcoming public holidays (on or after today):
${holidaysList}

${preferencesText}

Suggest 3-5 optimal vacation periods that maximize days off while minimizing vacation days used.
Hard rules:
- Every suggestion startDate must be on or after ${today}. Never suggest past dates.
- Only use holidays from the list above.

Consider:
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

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${PROMPT_HARDENING} Always return valid JSON arrays only for this task.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const usage = completion.usage || {};
    await commitUsage({
      model: MODEL,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      reservedUsd,
    });
    reservedUsd = 0;

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid suggestions format');
    }

    const futureSuggestions = suggestions.filter((s) => {
      const start = String(s?.startDate || '').slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= today;
    });

    return jsonResponse(200, { suggestions: futureSuggestions }, cors);
  } catch (error) {
    if (reservedUsd > 0) await releaseReservation(reservedUsd);
    logServerError('generate-ai-suggestions', error);
    return safeErrorResponse(500, cors);
  }
};
