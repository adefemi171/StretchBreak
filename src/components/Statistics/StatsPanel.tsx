import { calculateEfficiency } from '../../utils/planningAlgorithm';
import type { PublicHoliday } from '../../utils/types';
import './StatsPanel.css';

interface StatsPanelProps {
  vacationDays: string[];
  holidays: PublicHoliday[];
  availablePTODays?: number;
  onViewInsights?: () => void;
}

export const StatsPanel = ({
  vacationDays,
  holidays,
  availablePTODays,
  onViewInsights,
}: StatsPanelProps) => {
  const stats = calculateEfficiency(vacationDays, holidays);
  const efficiency =
    stats.vacationDaysUsed > 0
      ? stats.totalDaysOff / stats.vacationDaysUsed
      : 0;
  const remainingPTODays = availablePTODays !== undefined
    ? Math.max(0, availablePTODays - stats.vacationDaysUsed)
    : undefined;

  return (
    <section className="stats-panel" aria-label="Plan statistics">
      <div className="stats-header">
        <h3>Current selection</h3>
        <p className="stats-subtitle">PTO, days off, and efficiency for the days you've selected</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">PTO used</div>
          <div className="stat-value">{stats.vacationDaysUsed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total days off</div>
          <div className="stat-value">{stats.totalDaysOff}</div>
        </div>
        <div className={`stat-card ${efficiency >= 1.5 ? 'highlight' : ''}`}>
          <div className="stat-label">Efficiency</div>
          <div className="stat-value">
            {efficiency > 0 ? `${efficiency.toFixed(1)}×` : '—'}
          </div>
          <div className="stat-description">
            {efficiency > 0 ? 'days off per PTO day' : 'Select days to see stretch'}
          </div>
        </div>
        {remainingPTODays !== undefined && (
          <div className="stat-card">
            <div className="stat-label">Remaining PTO</div>
            <div className={`stat-value ${remainingPTODays === 0 ? 'warning' : remainingPTODays < 5 ? 'low' : ''}`}>
              {remainingPTODays}
            </div>
          </div>
        )}
      </div>
      {onViewInsights && (
        <div className="stats-insights-link">
          <button
            type="button"
            className="insights-link-button"
            onClick={onViewInsights}
          >
            View multi-plan analytics →
          </button>
        </div>
      )}
    </section>
  );
};
