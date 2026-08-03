import { useMemo } from 'react';
import { aggregateVacationAnalytics } from '../../utils/vacationAnalytics';
import { SmartRecommendations } from '../Recommendations/SmartRecommendations';
import { CommunityInsights } from '../Social/CommunityInsights';
import type { HolidayPlan, PublicHoliday } from '../../utils/types';
import './VacationAnalytics.css';

interface VacationAnalyticsProps {
  plans: HolidayPlan[];
  totalAvailablePTO?: number;
  countryCode?: string;
  year?: number;
  holidays?: PublicHoliday[];
}

export const VacationAnalytics = ({ 
  plans, 
  totalAvailablePTO,
  countryCode = 'US',
  year = new Date().getFullYear(),
  holidays = [],
}: VacationAnalyticsProps) => {
  const analytics = useMemo(() => {
    return aggregateVacationAnalytics(plans, totalAvailablePTO);
  }, [plans, totalAvailablePTO]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const showEmptyStateOnly = plans.length === 0 && holidays.length === 0;

  if (showEmptyStateOnly) {
    return (
      <div className="vacation-analytics">
        <div className="analytics-empty-state">
          <h3>No vacation data yet</h3>
          <p>Save plans to see year-over-year trends and patterns here.</p>
        </div>
      </div>
    );
  }

  const maxMonthDays = Math.max(...analytics.monthDistribution.map(m => m.vacationDays), 1);

  return (
    <div className="vacation-analytics">
      <header className="analytics-header">
        <h2>Analytics</h2>
        <p className="analytics-subtitle">Multi-plan patterns and year-over-year trends across your saved vacations</p>
      </header>

      {holidays.length > 0 && (
        <>
          <SmartRecommendations
            countryCode={countryCode}
            year={year}
            holidays={holidays}
          />

          <CommunityInsights
            plans={plans}
            holidays={holidays}
            year={year}
            countryCode={countryCode}
          />
        </>
      )}

      {plans.length === 0 && holidays.length > 0 && (
        <div className="analytics-info-message">
          <p>Save vacation plans to unlock year-over-year efficiency trends and patterns below.</p>
        </div>
      )}

      {plans.length === 0 && (
        <div style={{ height: '2rem' }} />
      )}

      {plans.length > 0 && (
        <div className="analytics-divider" />
      )}

      {plans.length > 0 && (
        <>
      {/* Summary Cards */}
      <section className="analytics-section">
        <h3>All-Time Summary</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total PTO Used</div>
            <div className="summary-value">{analytics.totalPTOAllTime}</div>
            <div className="summary-hint">days</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Avg Efficiency</div>
            <div className="summary-value">
              {analytics.avgEfficiencyAllTime > 0 
                ? `${analytics.avgEfficiencyAllTime.toFixed(1)}×`
                : '—'}
            </div>
            <div className="summary-hint">days off per PTO day</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Plans Created</div>
            <div className="summary-value">{analytics.totalPlansCount}</div>
            <div className="summary-hint">saved plans</div>
          </div>
          {analytics.utilizationRate !== undefined && (
            <div className="summary-card">
              <div className="summary-label">Utilization</div>
              <div className="summary-value">
                {(analytics.utilizationRate * 100).toFixed(0)}%
              </div>
              <div className="summary-hint">of total PTO</div>
            </div>
          )}
        </div>
      </section>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <section className="analytics-section">
          <h3>Highlights</h3>
          <div className="insights-list">
            {analytics.insights.map((insight, idx) => (
              <div key={idx} className={`insight-item insight-${insight.type}`}>
                <div className="insight-title">{insight.title}</div>
                <div className="insight-description">{insight.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Year-over-Year Stats */}
      {analytics.yearStats.length > 0 && (
        <section className="analytics-section">
          <h3>Year-over-Year</h3>
          <div className="year-stats-grid">
            {analytics.yearStats.map(yearStat => (
              <div key={yearStat.year} className="year-stat-card">
                <div className="year-stat-year">{yearStat.year}</div>
                <div className="year-stat-metrics">
                  <div className="year-stat-row">
                    <span className="year-stat-label">PTO Used</span>
                    <span className="year-stat-value">{yearStat.ptoUsed} days</span>
                  </div>
                  <div className="year-stat-row">
                    <span className="year-stat-label">Days Off</span>
                    <span className="year-stat-value">{yearStat.totalDaysOff} days</span>
                  </div>
                  <div className="year-stat-row">
                    <span className="year-stat-label">Avg Efficiency</span>
                    <span className="year-stat-value">
                      {yearStat.avgEfficiency > 0 ? `${yearStat.avgEfficiency.toFixed(1)}×` : '—'}
                    </span>
                  </div>
                  <div className="year-stat-row">
                    <span className="year-stat-label">Plans</span>
                    <span className="year-stat-value">{yearStat.planCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Month Distribution Heatmap */}
      <section className="analytics-section">
        <h3>Vacation Distribution by Month</h3>
        <p className="section-hint">Total vacation days taken per month across all plans</p>
        <div className="month-distribution">
          {analytics.monthDistribution.map(month => {
            const heightPercent = month.vacationDays > 0 
              ? (month.vacationDays / maxMonthDays) * 100 
              : 0;
            return (
              <div key={month.month} className="month-bar-container">
                <div className="month-bar-wrapper">
                  <div 
                    className={`month-bar ${month.vacationDays > 0 ? 'has-data' : ''}`}
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    title={`${monthNames[month.month]}: ${month.vacationDays} days`}
                  >
                    {month.vacationDays > 0 && (
                      <span className="month-bar-value">{month.vacationDays}</span>
                    )}
                  </div>
                </div>
                <div className="month-label">{monthNames[month.month]}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Efficiency Trend */}
      {analytics.efficiencyTrend.length > 0 && (
        <section className="analytics-section">
          <h3>Efficiency by Plan</h3>
          <p className="section-hint">Most recent plans first</p>
          <div className="efficiency-trend-list">
            {analytics.efficiencyTrend.slice(0, 10).map(trend => (
              <div key={trend.planId} className="efficiency-item">
                <div className="efficiency-item-header">
                  <span className="efficiency-plan-name">{trend.planName}</span>
                  <span className="efficiency-year-badge">{trend.year}</span>
                </div>
                <div className="efficiency-bar-container">
                  <div 
                    className="efficiency-bar"
                    style={{ width: `${Math.min((trend.efficiency / 3) * 100, 100)}%` }}
                  />
                  <span className="efficiency-value">{trend.efficiency.toFixed(1)}×</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
};
