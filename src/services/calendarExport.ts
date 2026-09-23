import type { HolidayPlan } from '../utils/types';
import { isSafeIsoDate } from '../utils/importValidation';
import { addDays, format, parseISO } from 'date-fns';

/** Escape text for ICS SUMMARY/DESCRIPTION (newlines, commas, semicolons, backslashes). */
export const escapeIcsText = (value: string): string => {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
};

/** Compact YYYYMMDD for ICS DATE values; rejects unsafe / injected strings. */
export const toIcsDateValue = (value: string): string | null => {
  if (!isSafeIsoDate(value)) return null;
  return value.replace(/-/g, '');
};

const nextDate = (date: string): string => format(addDays(parseISO(date), 1), 'yyyy-MM-dd');

// RFC 5545 limits physical lines to 75 octets (not 75 JavaScript characters).
const foldIcsLine = (line: string): string => {
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += size;
  }
  return [...lines, current].join('\r\n');
};

export const getCalendarLeavePeriods = (plan: HolidayPlan): Array<{ startDate: string; endDate: string }> => {
  const periods: Array<{ startDate: string; endDate: string }> = [];
  for (const date of [...new Set(plan.vacationDays.filter(isSafeIsoDate))].sort()) {
    const previous = periods[periods.length - 1];
    if (previous && nextDate(previous.endDate) === date) previous.endDate = date;
    else periods.push({ startDate: date, endDate: date });
  }
  return periods;
};

export const generateICal = (plan: HolidayPlan): string => {
  const lines: string[] = [];
  
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//StretchBreak//Holiday Plan//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  
  plan.publicHolidays.forEach(holiday => {
    const dateStr = toIcsDateValue(holiday.date);
    if (!dateStr) return;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:holiday-${encodeURIComponent(plan.id)}-${encodeURIComponent(holiday.localName)}-${dateStr}@stretchbreak`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDateValue(nextDate(holiday.date))}`);
    lines.push(`SUMMARY:${escapeIcsText(holiday.localName)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(`Public Holiday - ${holiday.name}`)}`);
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });
  
  [...new Set(plan.vacationDays)].sort().forEach((date, index) => {
    const dateStr = toIcsDateValue(date);
    if (!dateStr) return;
    const description = plan.description
      ? `${plan.name} - ${plan.description}`
      : plan.name;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:vacation-${encodeURIComponent(plan.id)}-${dateStr}@stretchbreak`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDateValue(nextDate(date))}`);
    lines.push(`SUMMARY:${escapeIcsText(`Vacation Day ${index + 1}`)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });
  
  lines.push('END:VCALENDAR');
  
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
};

export const downloadICal = (plan: HolidayPlan): void => {
  const icalContent = generateICal(plan);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${plan.name.replace(/\s+/g, '_')}_${plan.year}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateGoogleCalendarUrls = (plan: HolidayPlan): string[] => getCalendarLeavePeriods(plan).map(period => {
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: `${plan.name} - Vacation`,
    dates: `${toIcsDateValue(period.startDate)}/${toIcsDateValue(nextDate(period.endDate))}`,
    details: plan.description ?? 'Planned PTO leave',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
});

export const generateOutlookUrls = (plan: HolidayPlan): string[] => getCalendarLeavePeriods(plan).map(period => {
  const params = new URLSearchParams({
    subject: `${plan.name} - Vacation`, body: plan.description ?? 'Planned PTO leave',
    startdt: period.startDate, enddt: nextDate(period.endDate), allday: 'true',
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params}`;
});

// Legacy single-event callers must not silently combine separate leave periods.
export const generateGoogleCalendarUrl = (plan: HolidayPlan): string => {
  const urls = generateGoogleCalendarUrls(plan);
  return urls.length === 1 ? urls[0] : '';
};
export const generateOutlookUrl = (plan: HolidayPlan): string => {
  const urls = generateOutlookUrls(plan);
  return urls.length === 1 ? urls[0] : '';
};

export const generateSlackMessage = (plan: HolidayPlan): string => {
  const periods = getCalendarLeavePeriods(plan);
  if (!periods.length) return '';
  const display = (date: string) => format(parseISO(date), 'MMM d, yyyy');
  const dates = periods.map(period => period.startDate === period.endDate ? display(period.startDate)
    : `${display(period.startDate)} – ${display(period.endDate)}`).join('; ');
  return `*Vacation Notice: ${plan.name}*\n\n📅 *Leave dates:* ${dates}\n🌴 *PTO Days Used:* ${new Set(plan.vacationDays.filter(isSafeIsoDate)).size}\n${plan.description ? `\n${plan.description}` : ''}`;
};

/**
 * Allow HTTPS webhooks only; block localhost / private hosts to reduce exfil risk.
 * Prefer known Slack/Teams hosts when possible.
 */
export const isAllowedWebhookUrl = (webhookUrl: string): { ok: boolean; reason?: string } => {
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    return { ok: false, reason: 'Invalid webhook URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Webhook URL must use HTTPS' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    return { ok: false, reason: 'Localhost webhook URLs are not allowed' };
  }

  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) {
    return { ok: false, reason: 'Private network webhook URLs are not allowed' };
  }

  const allowedHosts = [
    'hooks.slack.com',
    'hooks.slack-gov.com',
    'outlook.office.com',
    'outlook.office365.com',
    'webhook.office.com',
  ];
  const isKnownHost = allowedHosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
  if (!isKnownHost) {
    return {
      ok: false,
      reason: 'Only Slack or Microsoft Teams incoming webhook URLs are allowed',
    };
  }

  return { ok: true };
};

// Post to webhook (user's own Slack/Teams incoming webhook)
export const postToWebhook = async (webhookUrl: string, plan: HolidayPlan): Promise<void> => {
  const allowed = isAllowedWebhookUrl(webhookUrl);
  if (!allowed.ok) {
    throw new Error(allowed.reason || 'Webhook URL not allowed');
  }

  const message = generateSlackMessage(plan);
  
  const payload = {
    text: message,
    mrkdwn: true,
  };
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
  }
};

