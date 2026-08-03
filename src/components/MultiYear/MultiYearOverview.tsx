import { useMemo } from 'react';
import { getAllPlans } from '../../services/planStorage';
import {
  getUsedPTODaysForYear,
  getTotalPTODaysForYear,
  getRemainingPTODaysForYear,
  hasTotalPTODaysForYear,
} from '../../services/ptoTracking';
import type { HolidayPlan } from '../../utils/types';
import './MultiYearOverview.css';

interface MultiYearOverviewProps {
  onSelectPlan?: (plan: HolidayPlan) => void;
}

interface YearStats {
  year: number;
  planCount: number;
  ptoUsed: number;
  totalDaysOff: number;
  monthDistribution: number[];
  plans: HolidayPlan[];
  totalPTO: number;
  remainingPTO: number;
  isYearSpecificTotal: boolean;
}

export const MultiYearOverview = ({ onSelectPlan }: MultiYearOverviewProps) => {
  const yearStats = useMemo(() => {
    const plans = getAllPlans();
    const statsByYear = new Map<number, YearStats>();

    plans.forEach(plan => {
      const year = plan.year;
      
      if (!statsByYear.has(year)) {
        statsByYear.set(year, {
          year,
          planCount: 0,
          ptoUsed: 0,
          totalDaysOff: 0,
          monthDistribution: Array(12).fill(0),
          plans: [],
          totalPTO: getTotalPTODaysForYear(year),
          remainingPTO: getRemainingPTODaysForYear(year),
          isYearSpecificTotal: hasTotalPTODaysForYear(year),
        });
      }

      const stats = statsByYear.get(year)!;
      stats.planCount += 1;
      stats.plans.push(plan);

      plan.vacationDays.forEach(dateStr => {
        if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const date = new Date(dateStr);
          if (date.getFullYear() === year) {
            const month = date.getMonth();
            stats.monthDistribution[month] += 1;
          }
        }
      });

      stats.totalDaysOff = plan.vacationDays.length + (plan.publicHolidays?.length || 0);
    });

    statsByYear.forEach((stats, year) => {
      stats.ptoUsed = getUsedPTODaysForYear(year);
      stats.totalPTO = getTotalPTODaysForYear(year);
      stats.remainingPTO = getRemainingPTODaysForYear(year);
      stats.isYearSpecificTotal = hasTotalPTODaysForYear(year);
    });

    return Array.from(statsByYear.values()).sort((a, b) => b.year - a.year);
  }, []);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (yearStats.length === 0) {
    return (
      <div className="multi-year-overview empty">
        <p>No plans yet. Create your first vacation plan to see multi-year insights.</p>
      </div>
    );
  }

  return (
    <div className="multi-year-overview">
      <div className="overview-header">
        <h2>Multi-Year Planning Overview</h2>
        <p className="overview-subtitle">Your vacation distribution across years</p>
      </div>

      <div className="year-stats-grid">
        {yearStats.map(stats => {
          const maxMonthValue = Math.max(...stats.monthDistribution, 1);
          const utilizationPercent = stats.totalPTO > 0 
            ? Math.round((stats.ptoUsed / stats.totalPTO) * 100)
            : 0;

          return (
            <div key={stats.year} className="year-card">
              <div className="year-card-header">
                <h3 className="year-title">{stats.year}</h3>
                <div className="year-summary">
                  <span className="stat-badge">{stats.planCount} plan{stats.planCount !== 1 ? 's' : ''}</span>
                  {stats.totalPTO > 0 && (
                    <span className="stat-badge pto">
                      {stats.ptoUsed} / {stats.totalPTO} PTO used
                      <span className="utilization-bar">
                        <span 
                          className="utilization-fill" 
                          style={{ width: `${utilizationPercent}%` }}
                        />
                      </span>
                    </span>
                  )}
                  {stats.totalPTO > 0 && (
                    <span className={`pto-source-label ${stats.isYearSpecificTotal ? 'year-specific' : 'global-fallback'}`}>
                      {stats.isYearSpecificTotal
                        ? `${stats.year} total`
                        : 'Using global default'}
                    </span>
                  )}
                </div>
              </div>

              <div className="month-distribution">
                <h4 className="section-label">Vacation days by month</h4>
                <div className="month-bars">
                  {stats.monthDistribution.map((count, monthIndex) => {
                    const heightPercent = maxMonthValue > 0 ? (count / maxMonthValue) * 100 : 0;
                    return (
                      <div key={monthIndex} className="month-bar-wrapper">
                        <div className="month-bar-container">
                          <div 
                            className="month-bar"
                            style={{ height: `${Math.max(heightPercent, count > 0 ? 10 : 0)}%` }}
                            title={`${count} day${count !== 1 ? 's' : ''} in ${monthNames[monthIndex]}`}
                          >
                            {count > 0 && <span className="bar-value">{count}</span>}
                          </div>
                        </div>
                        <span className="month-label">{monthNames[monthIndex]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="year-plans-list">
                <h4 className="section-label">Plans for {stats.year}</h4>
                {stats.plans.map(plan => (
                  <button
                    key={plan.id}
                    className="year-plan-item"
                    onClick={() => onSelectPlan?.(plan)}
                    type="button"
                  >
                    <span className="plan-name">{plan.name}</span>
                    <span className="plan-days">{plan.vacationDays.length} days</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
