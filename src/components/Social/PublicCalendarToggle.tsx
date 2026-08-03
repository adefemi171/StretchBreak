import { useState, useEffect } from 'react';
import type { HolidayPlan } from '../../utils/types';
import { generateShareUrl, copyToClipboard } from '../../services/shareService';
import './PublicCalendarToggle.css';

const STORAGE_KEY = 'stretchbreak-public-calendar';

interface PublicCalendarToggleProps {
  plan: HolidayPlan | null;
}

export const PublicCalendarToggle = ({ plan }: PublicCalendarToggleProps) => {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }, [enabled]);

  if (!plan || plan.vacationDays.length === 0) {
    return null;
  }

  const months = Array.from(
    new Set(plan.vacationDays.map(d => d.slice(0, 7)))
  ).sort();

  const handleCopy = async () => {
    const url = generateShareUrl(plan);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Could not copy link. Try again.');
    }
  };

  return (
    <section className="public-calendar" aria-labelledby="public-cal-title">
      <header className="public-calendar-header">
        <div>
          <h3 id="public-cal-title">Public vacation calendar</h3>
          <p className="public-calendar-desc">
            Generates a local share URL with plan data encoded in the query string — not hosted publicly,
            not encrypted, and not a real ACL. Off by default.
          </p>
        </div>
        <label className="public-calendar-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Enable public share link for this plan"
          />
          <span>{enabled ? 'On' : 'Off'}</span>
        </label>
      </header>

      {enabled && (
        <div className="public-calendar-body">
          <div className="public-calendar-months" aria-label="Months with vacation days">
            {months.map(month => {
              const days = plan.vacationDays.filter(d => d.startsWith(month)).length;
              return (
                <div key={month} className="public-calendar-chip">
                  <span className="public-calendar-month">{month}</span>
                  <span className="public-calendar-count">{days} day{days === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
          <button type="button" className="public-calendar-copy" onClick={handleCopy}>
            {copied ? 'Link copied' : 'Copy public share link'}
          </button>
        </div>
      )}
    </section>
  );
};
