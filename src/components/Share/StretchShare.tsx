import { useState } from 'react';
import { calculateEfficiency, getVacationBreaks } from '../../utils/planningAlgorithm';
import { formatDateDisplay } from '../../utils/dateUtils';
import type { PublicHoliday } from '../../utils/types';
import './StretchShare.css';

interface StretchShareProps {
  vacationDays: string[];
  holidays: PublicHoliday[];
  countryCode: string;
  year: number;
  workDays?: number[];
}

export const StretchShare = ({
  vacationDays,
  holidays,
  countryCode,
  year,
  workDays,
}: StretchShareProps) => {
  const [copied, setCopied] = useState(false);

  if (vacationDays.length === 0) {
    return null;
  }

  const stats = calculateEfficiency(vacationDays, holidays, workDays);
  const efficiency =
    stats.vacationDaysUsed > 0
      ? stats.totalDaysOff / stats.vacationDaysUsed
      : 0;

  const range = getVacationBreaks(vacationDays, holidays, workDays).map(period => `${formatDateDisplay(period.startDate)} – ${formatDateDisplay(period.endDate)}`).join('; ');

  const snippet = [
    `I stretched ${stats.vacationDaysUsed} PTO day${stats.vacationDaysUsed === 1 ? '' : 's'} into ${stats.totalDaysOff} days off (${efficiency.toFixed(1)}×) with StretchBreak.`,
    range ? `Breaks: ${range}` : '',
    `Country: ${countryCode} · ${year}`,
    'Plan yours: https://github.com/adefemi171/StretchBreak',
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="stretch-share" aria-label="Share your stretch">
      <div className="stretch-share-copy">
        <h3>Share your stretch</h3>
        <p>Preview and copy a summary to share.</p>
      </div>
      <pre className="stretch-share-preview">{snippet}</pre>
      <button type="button" className="stretch-share-button" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy summary'}
      </button>
    </section>
  );
};
