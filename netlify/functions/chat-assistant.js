import { guardAIRequest, jsonResponse, safeErrorResponse, logServerError, PROMPT_HARDENING, sanitizeUserText, sanitizeHistory } from './_shared/aiGuard.js';
import { parsePlanningContext, loadPlanningHolidays, buildCandidates, InputError } from './_shared/aiPlanning.js';
import { complete, QuotaError } from './_shared/aiCompletion.js';

export const handler = async (event) => {
  const blocked = await guardAIRequest(event);
  if (blocked) return blocked;
  const { body, cors } = event._aiGuard;
  try {
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) throw new InputError('Enter a message of up to 2,000 characters.');
    const context = parsePlanningContext(body);
    const holidays = await loadPlanningHolidays(context);
    const candidates = buildCandidates(context, holidays).slice(0, 8);
    const response = await complete(event, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${PROMPT_HARDENING} Provide concise guidance. Only discuss breaks from the calculated candidates. Explain that public-holiday eligibility depends on the employer and selected work region. Do not state a next working date or remaining PTO unless supplied in context. Respond as plain text.` },
        { role: 'user', content: JSON.stringify({ planningContext: { year: context.year, countryCode: context.countryCode, workDays: context.workDays, remainingPTO: context.budget, companyHolidays: context.companyHolidays, holidays: holidays.filter(({ date }) => date >= context.startDate && date <= context.endDate).slice(0, 40).map(({ date, localName }) => ({ date, name: sanitizeUserText(localName, 80) })), candidates: candidates.map(({ startDate, endDate, vacationDaysUsed, totalDaysOff }) => ({ startDate, endDate, vacationDaysUsed, totalDaysOff })) } }) },
        ...sanitizeHistory(body.conversationHistory),
        { role: 'user', content: sanitizeUserText(body.message) },
      ],
      max_tokens: 700,
    });
    return jsonResponse(200, { response: sanitizeUserText(response, 6000) }, cors);
  } catch (error) {
    if (error instanceof InputError) return jsonResponse(400, { error: error.message }, cors);
    if (error instanceof QuotaError) return jsonResponse(429, { error: error.message, code: error.code }, { ...cors, 'Retry-After': '60' });
    logServerError('chat', error);
    return safeErrorResponse(503, cors);
  }
};
