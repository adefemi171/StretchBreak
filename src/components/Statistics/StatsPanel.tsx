import { calculateEfficiency } from '../../utils/planningAlgorithm';
import type { PublicHoliday } from '../../utils/types';
import './StatsPanel.css';

interface StatsPanelProps {
  vacationDays: string[];
  holidays: PublicHoliday[];
  availablePTODays?: number;
}

export const StatsPanel = ({
  vacationDays,
  holidays,
  availablePTODays,
}: StatsPanelProps) => {
  const stats = calculateEfficiency(vacationDays, holidays);
  const remainingPTODays = availablePTODays !== undefined 
    ? Math.max(0, availablePTODays - stats.vacationDaysUsed)
    : undefined;
  
  return (
    <div className="stats-panel">
      <h3>Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Vacation Days Used</div>
          <div className="stat-value">{stats.vacationDaysUsed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Days Off</div>
          <div className="stat-value">{stats.totalDaysOff}</div>
        </div>
        {remainingPTODays !== undefined && (
          <div className="stat-card">
            <div className="stat-label">Remaining PTO Days</div>
            <div className={`stat-value ${remainingPTODays === 0 ? 'warning' : remainingPTODays < 5 ? 'low' : ''}`}>
              {remainingPTODays}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

