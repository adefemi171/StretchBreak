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

const MODEL = 'gpt-4o';

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
    const plan = body.plan || {};
    const startDate = sanitizeUserText(String(body.startDate || ''), 32);
    const endDate = sanitizeUserText(String(body.endDate || ''), 32);
    const options = body.options || {};

    if (!startDate || !endDate) {
      return jsonResponse(400, { error: 'startDate and endDate are required' }, cors);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return jsonResponse(400, { error: 'Invalid date format' }, cors);
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

    const includeDates = options.includeDates !== false;
    const includeBackDate = options.includeBackDate !== false;
    const tone = ['professional', 'casual', 'brief'].includes(options.tone)
      ? options.tone
      : 'professional';

    const backDate = new Date(endDate);
    if (Number.isNaN(backDate.getTime())) {
      await releaseReservation(reservedUsd);
      reservedUsd = 0;
      return jsonResponse(400, { error: 'Invalid endDate' }, cors);
    }
    backDate.setDate(backDate.getDate() + 1);
    const backDateStr = backDate.toISOString().split('T')[0];

    const dateRange = includeDates
      ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'this period';

    const toneDescription = {
      professional: 'professional and formal',
      casual: 'friendly and casual',
      brief: 'concise and brief',
    }[tone];

    const requirements = [];
    if (tone === 'brief') {
      requirements.push('- Keep it very short and concise (1-2 sentences max)');
    } else if (tone === 'professional') {
      requirements.push('- Use formal business language');
      requirements.push('- Mention limited email access');
      requirements.push('- Include professional closing');
    } else {
      requirements.push('- Use friendly, conversational language');
      requirements.push('- Keep it warm and approachable');
    }
    requirements.push('- Include a placeholder for alternative contact (use [alternative contact])');
    if (includeBackDate) {
      requirements.push('- Mention when you will be back');
    }
    requirements.push('- Do NOT include email signatures or subject lines');
    requirements.push('- Return ONLY the message body text');

    const planName = sanitizeUserText(String(plan.name || 'Vacation'), 120);
    const planDescription = plan.description
      ? sanitizeUserText(String(plan.description), 300)
      : '';

    const prompt = `Generate an out-of-office email message with the following requirements:

- Tone: ${toneDescription}
- Date range: ${dateRange}
${includeBackDate ? `- Return date: ${new Date(backDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
- Plan name: ${planName}
${planDescription ? `- Description: ${planDescription}` : ''}

Requirements:
${requirements.join('\n')}

Generate the message:`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${PROMPT_HARDENING} Generate only professional out-of-office email message bodies. Return only the message body text, no subject lines or signatures.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const usage = completion.usage || {};
    await commitUsage({
      model: MODEL,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      reservedUsd,
    });
    reservedUsd = 0;

    const message =
      sanitizeUserText(completion.choices[0]?.message?.content?.trim() || '', 2000) || '';

    return jsonResponse(200, { message }, cors);
  } catch (error) {
    if (reservedUsd > 0) await releaseReservation(reservedUsd);
    logServerError('generate-ooo-message', error);
    return safeErrorResponse(500, cors);
  }
};
