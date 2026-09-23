import { useMemo, useState } from 'react';
import { parseISO, isPast, startOfDay, isSameDay } from 'date-fns';
import { findOptimalVacationPeriods } from '../../utils/planningAlgorithm';
import { formatDateDisplay } from '../../utils/dateUtils';
import type { PublicHoliday, PlanSuggestion, SuggestionFilters } from '../../utils/types';
import { applySuggestionFilters, getEmptyFilters } from '../../utils/suggestionFilters';
import { SuggestionFilters as SuggestionFiltersUI } from '../SuggestionFilters/SuggestionFilters';
import './BridgeBoard.css';

interface BridgeBoardProps {
  holidays: PublicHoliday[];
  year: number;
  countryCode: string;
  loading?: boolean;
  suggestions?: PlanSuggestion[];
  onUseBridge: (suggestion: PlanSuggestion) => void;
}

export const BridgeBoard = ({
  holidays,
  year,
  countryCode,
  loading = false,
  suggestions: candidates,
  onUseBridge,
}: BridgeBoardProps) => {
  const [filters, setFilters] = useState<SuggestionFilters>(getEmptyFilters());

  const bridges = useMemo(() => {
    if (holidays.length === 0) return [];

    const today = startOfDay(new Date());
    const suggestions = candidates ?? findOptimalVacationPeriods(holidays, year);

    const futureOrToday = suggestions.filter((s) => {
      const start = parseISO(s.startDate);
      return !isPast(start) || isSameDay(start, today);
    });

    const filtered = applySuggestionFilters(futureOrToday, filters);

    return filtered.slice(0, 6);
  }, [holidays, year, filters, candidates]);

  if (loading) {
    return (
      <section className="bridge-board">
        <h2>Bridge Board</h2>
        <p className="bridge-subtitle">Scanning public holidays for stretch opportunities…</p>
      </section>
    );
  }


  return (
    <section className="bridge-board" aria-label="Upcoming bridge day opportunities">
      <div className="bridge-board-header">
        <div>
          <h2>Bridge Board</h2>
          <p className="bridge-subtitle">
            Best upcoming stretches in {countryCode} for {year} — no sign-up, no AI required.
          </p>
        </div>
      </div>

      <details className="suggestion-filter-details"><summary>Filter breaks</summary><SuggestionFiltersUI filters={filters} onChange={setFilters} /></details>

      {bridges.length === 0 && <div role="status"><p>No breaks match your allowance, timeframe and filters.</p><button type="button" className="ghost-button" onClick={() => setFilters(getEmptyFilters())}>Clear filters</button></div>}
      <div className="bridge-grid">
        {bridges.map((bridge) => (
          <article key={`${bridge.startDate}-${bridge.endDate}`} className="bridge-card">
            <div className="bridge-card-top">
              <span className="bridge-efficiency">{bridge.efficiency.toFixed(1)}×</span>
              <span className="bridge-dates">
                {formatDateDisplay(bridge.startDate)} – {formatDateDisplay(bridge.endDate)}
              </span>
            </div>
            <p className="bridge-reason">{bridge.reason}</p>
            <div className="bridge-meta">
              <span>{bridge.vacationDaysUsed} PTO</span>
              <span aria-hidden="true">→</span>
              <span>{bridge.totalDaysOff} days off</span>
            </div>
            <button type="button" className="bridge-use-button" onClick={() => onUseBridge(bridge)}>
              Preview this break
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
