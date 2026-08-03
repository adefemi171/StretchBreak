import { useMemo } from 'react';
import { generateCommunityInsights, getLocalPopularityLabel } from '../../utils/communityInsights';
import type { HolidayPlan, PublicHoliday } from '../../utils/types';
import './CommunityInsights.css';

interface CommunityInsightsProps {
  plans: HolidayPlan[];
  holidays: PublicHoliday[];
  year: number;
  countryCode: string;
}

export const CommunityInsights = ({
  plans,
  holidays,
  year,
  countryCode,
}: CommunityInsightsProps) => {
  const { popularPeriods, insights } = useMemo(() => {
    try {
      return generateCommunityInsights(plans, holidays, year);
    } catch (error) {
      console.error('Failed to generate community insights:', error);
      return { popularPeriods: [], insights: [] };
    }
  }, [plans, holidays, year]);

  const hasData = plans.length > 0;

  if (!hasData) {
    return (
      <div className="community-insights">
        <header className="insights-header">
          <h3>Your Vacation Patterns</h3>
          <p className="insights-subtitle">
            From your saved plans and local holiday bridges — not a live community feed
          </p>
        </header>
        <div className="insights-empty">
          <p>Save vacation plans to see patterns from your history and holiday bridges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-insights">
      <header className="insights-header">
        <h3>Your Vacation Patterns</h3>
        <p className="insights-subtitle">
          From your saved plans and local holiday bridges — not a live community feed
        </p>
      </header>

      {popularPeriods.length > 0 && (
        <section className="insights-section">
          <h4 className="section-title">Periods You Use Most</h4>
          <div className="popular-periods-list">
            {popularPeriods.map((period, idx) => (
              <div key={idx} className="popular-period-item">
                <div className="period-label">{period.label}</div>
                <div className="period-info">
                  <span className="period-reason">{period.reason}</span>
                  <span className="period-badge">{getLocalPopularityLabel(period.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section className="insights-section">
          <h4 className="section-title">Key Patterns</h4>
          <div className="insights-list">
            {insights.map((insight, idx) => (
              <div key={idx} className="insight-card">
                <div className="insight-content">
                  <h5 className="insight-title">{insight.title}</h5>
                  <p className="insight-description">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="insights-footer">
        <div className="insights-privacy">
          <p className="privacy-text">
            Computed locally from your saved plans. No community data or external sharing.
          </p>
        </div>
      </footer>
    </div>
  );
};
