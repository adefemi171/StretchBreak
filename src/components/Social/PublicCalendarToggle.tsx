import { useState } from 'react';
import type { HolidayPlan } from '../../utils/types';
import { generateShareUrl, copyToClipboard } from '../../services/shareService';
import './PublicCalendarToggle.css';


interface PublicCalendarToggleProps {
  plan: HolidayPlan | null;
}

export const PublicCalendarToggle = ({ plan }: PublicCalendarToggleProps) => {
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);


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
          <h3 id="public-cal-title">Share a plan snapshot</h3>
          <p className="public-calendar-desc">
            Anyone with this link can read the plan name, notes, dates and holiday settings.
            The snapshot is not encrypted and cannot be revoked. Hiding this preview does not disable links already copied.
          </p>
        </div>
        <label className="public-calendar-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Show share preview for this plan"
          />
          <span>{enabled ? 'Hide preview' : 'Show preview'}</span>
        </label>
      </header>

      {enabled && (
        <div className="public-calendar-body">
          <p><strong>{plan.name}</strong>{plan.description ? ` · ${plan.description}` : ''}</p>
          <p>{plan.countryCode} · {plan.vacationDays.length} selected dates · {(plan.selectedRegions || []).join(', ') || 'National holidays only'}</p>
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
            {copied ? 'Link copied' : 'Copy snapshot link'}
          </button>
        </div>
      )}
    </section>
  );
};
