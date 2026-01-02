import type { HolidayPlan } from '../utils/types';

export const generateICal = (plan: HolidayPlan): string => {
  const lines: string[] = [];
  
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//StretchBreak//Holiday Plan//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  
  plan.publicHolidays.forEach(holiday => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:holiday-${holiday.date}@stretchbreak`);
    lines.push(`DTSTART;VALUE=DATE:${holiday.date.replace(/-/g, '')}`);
    lines.push(`DTEND;VALUE=DATE:${holiday.date.replace(/-/g, '')}`);
    lines.push(`SUMMARY:${holiday.localName}`);
    lines.push(`DESCRIPTION:Public Holiday - ${holiday.name}`);
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });
  
  plan.vacationDays.forEach((date, index) => {
    const dateStr = date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:vacation-${date}@stretchbreak`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:Vacation Day ${index + 1}`);
    lines.push(`DESCRIPTION:${plan.name}${plan.description ? ' - ' + plan.description : ''}`);
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

