import { useEffect, useMemo } from 'react';
import type { HolidayPlan } from '../../utils/types';
import {
  comparePlans,
  formatDateRange,
  getStrategyDisplayName,
  type PlanComparisonMetrics,
} from '../../utils/planComparison';
import './PlanComparison.css';

interface PlanComparisonProps {
  selectedPlans: HolidayPlan[];
  onClose: () => void;
}

export const PlanComparison = ({ selectedPlans, onClose }: PlanComparisonProps) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const comparisonResult = useMemo(() => {
    if (selectedPlans.length < 2) return null;
    return comparePlans(selectedPlans);
  }, [selectedPlans]);

  if (!comparisonResult) {
    return (
      <div className="plan-comparison">
        <div className="comparison-header">
          <h3>Compare Plans</h3>
          <button type="button" onClick={onClose} className="close-button" aria-label="Close comparison">
            ×
          </button>
        </div>
        <div className="comparison-empty">
          <p>Select at least 2 plans to compare</p>
        </div>
      </div>
    );
  }

  const { metrics, bestByEfficiency, bestByTotalDaysOff } = comparisonResult;

  const renderMetricCard = (metric: PlanComparisonMetrics) => {
    const isBestEfficiency = metric.plan.id === bestByEfficiency;
    const isBestTotalDays = metric.plan.id === bestByTotalDaysOff;
    const isWorstEfficiency = metric.efficiency === Math.min(...metrics.map(m => m.efficiency));
    const isWorstTotalDays = metric.totalDaysOff === Math.min(...metrics.map(m => m.totalDaysOff));

    return (
      <div
        key={metric.plan.id}
        className={`comparison-card ${isBestEfficiency || isBestTotalDays ? 'best' : ''} ${
          isWorstEfficiency && isWorstTotalDays ? 'worst' : ''
        }`}
      >
        <div className="comparison-card-header">
          <h4>{metric.plan.name}</h4>
          {(isBestEfficiency || isBestTotalDays) && (
            <div className="best-badges">
              {isBestEfficiency && (
                <span className="best-badge efficiency" title="Best efficiency">
                  Best Efficiency
                </span>
              )}
              {isBestTotalDays && (
                <span className="best-badge total-days" title="Most total days off">
                  Most Days Off
                </span>
              )}
            </div>
          )}
        </div>

        <div className="comparison-meta">
          <div className="meta-item">
            <span className="meta-label">Year</span>
            <span className="meta-value">{metric.plan.year}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Country</span>
            <span className="meta-value">{metric.plan.countryCode}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Strategy</span>
            <span className="meta-value">{getStrategyDisplayName(metric.plan.strategy)}</span>
          </div>
        </div>

        <div className="comparison-metrics">
          <div className="metric-row">
            <span className="metric-label">PTO Used</span>
            <span className="metric-value vacation">{metric.vacationDaysUsed} days</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Total Days Off</span>
            <span className="metric-value total">{metric.totalDaysOff} days</span>
          </div>
          <div className="metric-row highlight">
            <span className="metric-label">Efficiency</span>
            <span className="metric-value efficiency">{metric.efficiency.toFixed(2)}×</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Public Holidays</span>
            <span className="metric-value">{metric.holidayCount}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Date Range</span>
            <span className="metric-value date-range">
              {formatDateRange(metric.dateRange.start, metric.dateRange.end)}
            </span>
          </div>
        </div>

        {metric.plan.description && (
          <div className="comparison-description">
            <p>{metric.plan.description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="plan-comparison">
      <div className="comparison-header">
        <div className="comparison-header-content">
          <h3>Plan Comparison</h3>
          <p className="comparison-subtitle">
            Comparing {selectedPlans.length} plan{selectedPlans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} className="close-button" title="Close comparison" aria-label="Close comparison">
          ×
        </button>
      </div>

      <div className="comparison-grid">
        {metrics.map(renderMetricCard)}
      </div>

      <div className="comparison-insights">
        <h4>Comparison summary</h4>
        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-label">Best Efficiency:</span>
            <span className="insight-value">
              {metrics.find(m => m.plan.id === bestByEfficiency)?.plan.name} (
              {metrics.find(m => m.plan.id === bestByEfficiency)?.efficiency.toFixed(2)}×)
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Most Days Off:</span>
            <span className="insight-value">
              {metrics.find(m => m.plan.id === bestByTotalDaysOff)?.plan.name} (
              {metrics.find(m => m.plan.id === bestByTotalDaysOff)?.totalDaysOff} days)
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Total PTO Range:</span>
            <span className="insight-value">
              {Math.min(...metrics.map(m => m.vacationDaysUsed))} –{' '}
              {Math.max(...metrics.map(m => m.vacationDaysUsed))} days
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Total Days Off Range:</span>
            <span className="insight-value">
              {Math.min(...metrics.map(m => m.totalDaysOff))} –{' '}
              {Math.max(...metrics.map(m => m.totalDaysOff))} days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
