import type { PublicHoliday, PlanSuggestion, UserPreferences, ChatMessage } from '../utils/types';

export interface AIPlanningContext {
  countryCode: string;
  selectedRegions?: string[];
  availablePTODays: number;
  workDays?: number[];
  companyHolidays?: { date: string; name: string }[];
  excludedHolidayDates?: string[];
  startDate?: string;
  endDate?: string;
}
export interface AIStatus { ready: boolean; sessionReady: boolean; siteKey?: string }
let statusCache: { value: AIStatus; expires: number } | null = null;
let statusPromise: Promise<AIStatus> | null = null;
const offline = 'AI is temporarily unavailable. You can still use the planner without AI.';

export async function requestAI<T>(functionName: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(abort, 30_000);
  try {
    const response = await fetch(`/.netlify/functions/${functionName}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error(offline);
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 503) resetAIAvailabilityCache();
      throw new Error(typeof data.error === 'string' ? data.error : offline);
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error(offline);
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function getAIStatus(force = false): Promise<AIStatus> {
  if (!force && statusCache && statusCache.expires > Date.now()) return statusCache.value;
  if (statusPromise) return statusPromise;
  statusPromise = (async () => {
    let value: AIStatus = { ready: false, sessionReady: false };
    try {
      const result = await requestAI<AIStatus & { ok: boolean }>('generate-ai-suggestions', { ping: true }, AbortSignal.timeout(4000));
      if (result.ok === true && result.ready === true) value = { ready: true, sessionReady: result.sessionReady === true, siteKey: result.siteKey };
    } catch { /* An unavailable probe is a normal UI state. */ }
    statusCache = { value, expires: Date.now() + 15_000 };
    return value;
  })();
  try { return await statusPromise; } finally { statusPromise = null; }
}
export const checkAIAvailability = async (): Promise<boolean> => (await getAIStatus()).ready;
export const isAIAvailable = (): boolean => statusCache?.value.ready === true && statusCache.expires > Date.now();
export const resetAIAvailabilityCache = (): void => { statusCache = null; };
export async function verifyAIAccess(token: string): Promise<void> {
  await requestAI('ai-session', { token });
  resetAIAvailabilityCache();
}

export const generateAISuggestions = async (
  holidays: PublicHoliday[], year: number, preferences?: UserPreferences, context?: AIPlanningContext, signal?: AbortSignal
): Promise<PlanSuggestion[]> => {
  void holidays; // Kept for the existing hook API; public holiday data is fetched server-side.
  if (!context) throw new Error('Choose your country, region and remaining PTO before using AI.');
  const data = await requestAI<{ suggestions: PlanSuggestion[] }>('generate-ai-suggestions', {
    ...context, year, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, preferences: preferences ? { preferredMonths: preferences.preferredMonths } : undefined,
    // The server retrieves public holidays; names and dates from the browser are not authoritative.
  }, signal);
  if (!Array.isArray(data.suggestions)) throw new Error('AI returned an invalid response.');
  return data.suggestions;
};

export const chatWithAssistant = async (
  message: string,
  context: Partial<AIPlanningContext> & {
    holidays: PublicHoliday[]; year: number; currentPlan?: { vacationDays: string[] };
    preferences?: UserPreferences; conversationHistory?: ChatMessage[];
  },
  signal?: AbortSignal
): Promise<string> => {
  const data = await requestAI<{ response: string }>('chat-assistant', {
    message, year: context.year, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, countryCode: context.countryCode, selectedRegions: context.selectedRegions,
    availablePTODays: context.availablePTODays, workDays: context.workDays, companyHolidays: context.companyHolidays,
    excludedHolidayDates: context.excludedHolidayDates,
    startDate: context.startDate, endDate: context.endDate,
    conversationHistory: context.conversationHistory?.slice(-6).map(({ role, content }) => ({ role, content })),
  }, signal);
  if (typeof data.response !== 'string') throw new Error('AI returned an invalid response.');
  return data.response;
};
