import { guardAIRequest, jsonResponse, safeErrorResponse, logServerError, PROMPT_HARDENING } from './_shared/aiGuard.js';
import { parsePlanningContext, loadPlanningHolidays, buildCandidates, validateRanking, rankingSchema, InputError } from './_shared/aiPlanning.js';
import { complete, QuotaError } from './_shared/aiCompletion.js';

export const handler = async (event) => {
  const blocked = await guardAIRequest(event);
  if (blocked) return blocked;
  const { body, cors } = event._aiGuard;
  try {
    const context = parsePlanningContext(body);
    const holidays = await loadPlanningHolidays(context);
    const candidates = buildCandidates(context, holidays);
    if (!candidates.length) return jsonResponse(200, { suggestions: [] }, cors);
    const months = Array.isArray(body.preferences?.preferredMonths) ? body.preferences.preferredMonths.filter((value) => Number.isInteger(value) && value >= 1 && value <= 12).slice(0, 12) : [];
    const content = await complete(event, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${PROMPT_HARDENING} Rank up to five supplied vacation candidates by useful variety and user month preferences. Return only candidate IDs. Never invent dates, counts or candidates.` },
        { role: 'user', content: JSON.stringify({ preferredMonths: months, candidates: candidates.map(({ id, startDate, endDate, totalDaysOff, vacationDaysUsed }) => ({ id, startDate, endDate, totalDaysOff, vacationDaysUsed })) }) },
      ],
      response_format: { type: 'json_schema', json_schema: rankingSchema },
      max_tokens: 250,
    });
    return jsonResponse(200, { suggestions: validateRanking(content, candidates) }, cors);
  } catch (error) {
    if (error instanceof InputError) return jsonResponse(400, { error: error.message }, cors);
    if (error instanceof QuotaError) return jsonResponse(429, { error: error.message, code: error.code }, { ...cors, 'Retry-After': '60' });
    logServerError('suggestions', error);
    return safeErrorResponse(503, cors);
  }
};
