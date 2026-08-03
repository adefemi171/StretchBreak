import type { HolidayPlan } from '../utils/types';
import { isSafeIsoDate } from '../utils/importValidation';

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
    lines.push(`UID:holiday-${dateStr}@stretchbreak`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${escapeIcsText(holiday.localName)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(`Public Holiday - ${holiday.name}`)}`);
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });
  
  plan.vacationDays.forEach((date, index) => {
    const dateStr = toIcsDateValue(date);
    if (!dateStr) return;
    const description = plan.description
      ? `${plan.name} - ${plan.description}`
      : plan.name;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:vacation-${dateStr}@stretchbreak`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${escapeIcsText(`Vacation Day ${index + 1}`)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });
  
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
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

// Generate Google Calendar deep link
export const generateGoogleCalendarUrl = (plan: HolidayPlan): string => {
  const sortedDays = plan.vacationDays.filter(isSafeIsoDate).sort();
  if (sortedDays.length === 0) return '';
  
  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];
  
  // Format dates as YYYYMMDD for Google Calendar
  const startDate = toIcsDateValue(firstDay);
  const endDate = toIcsDateValue(lastDay);
  if (!startDate || !endDate) return '';
  
  const title = encodeURIComponent(`${plan.name} - Vacation`);
  const details = encodeURIComponent(
    plan.description 
      ? `${plan.description}\n\nVacation days: ${plan.vacationDays.length}` 
      : `Vacation days: ${plan.vacationDays.length}`
  );
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
};

// Generate Outlook web deep link
export const generateOutlookUrl = (plan: HolidayPlan): string => {
  const sortedDays = plan.vacationDays.filter(isSafeIsoDate).sort();
  if (sortedDays.length === 0) return '';
  
  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];
  
  const title = encodeURIComponent(`${plan.name} - Vacation`);
  const body = encodeURIComponent(
    plan.description 
      ? `${plan.description}\n\nVacation days: ${plan.vacationDays.length}` 
      : `Vacation days: ${plan.vacationDays.length}`
  );
  
  // Outlook expects ISO 8601 format
  return `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&body=${body}&startdt=${firstDay}&enddt=${lastDay}&allday=true`;
};

// Generate Slack/Teams formatted message
export const generateSlackMessage = (plan: HolidayPlan): string => {
  const sortedDays = plan.vacationDays.filter(isSafeIsoDate).sort();
  if (sortedDays.length === 0) return '';
  
  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];
  
  // Format dates nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  let message = `*Vacation Notice: ${plan.name}*\n\n`;
  message += `📅 *Dates:* ${formatDate(firstDay)}`;
  if (firstDay !== lastDay) {
    message += ` - ${formatDate(lastDay)}`;
  }
  message += `\n🌴 *PTO Days Used:* ${plan.vacationDays.length}\n`;
  
  if (plan.description) {
    message += `\n${plan.description}`;
  }
  
  return message;
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

