import { calculateEfficiency } from '../../utils/planningAlgorithm';
import type { PublicHoliday } from '../../utils/types';
import './StatsPanel.css';

interface StatsPanelProps {
  vacationDays: string[];
  holidays: PublicHoliday[];
}

export const StatsPanel = ({
  vacationDays,
  holidays,
}: StatsPanelProps) => {
  const stats = calculateEfficiency(vacationDays, holidays);
  
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
      </div>
    </div>
  );
};

