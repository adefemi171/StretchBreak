import { OpenAI } from 'openai';
import { reserveSpend, commitUsage } from './aiGuard.js';

export class QuotaError extends Error { constructor(code) { super('AI usage limit reached. Please try again later.'); this.code = code; } }

export async function complete(event, parameters) {
  const reservation = await reserveSpend(parameters.model, event);
  if (!reservation.ok) throw new QuotaError(reservation.code);
  // No automatic retries: an uncertain provider response may already have been billed.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20_000, maxRetries: 0 });
  const completion = await openai.chat.completions.create(parameters);
  await commitUsage({ model: parameters.model, promptTokens: completion.usage?.prompt_tokens, completionTokens: completion.usage?.completion_tokens, reservation, event });
  const choice = completion.choices?.[0];
  if (choice?.finish_reason !== 'stop' || choice.message?.refusal || typeof choice.message?.content !== 'string') throw new Error('AI response incomplete');
  return choice.message.content;
  // Failures retain the reservation, including timeout/unknown billing and storage failures.
}
