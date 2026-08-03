import { useState } from 'react';
import { PTOInput } from './PTOInput';
import { TimeframeSelector, type TimeframeType } from './TimeframeSelector';
import { CompanyHolidays } from './CompanyHolidays';
import { TemplatePicker } from '../Templates/TemplatePicker';
import { WishlistPanel } from '../Wishlist/WishlistPanel';
import { setTotalPTODays, setTotalPTODaysForYear, getEffectiveAvailablePTODays } from '../../services/ptoTracking';
import type { CompanyHoliday, PlanningConfig, VacationTemplate, PlanSuggestion } from '../../utils/types';
import './PlanningConfigPanel.css';

interface PlanningConfigPanelProps {
  config: PlanningConfig;
  holidays: unknown[];
  countryCode: string;
  onConfigChange: (config: PlanningConfig) => void;
  onOptimize: () => void;
  suggestions?: PlanSuggestion[];
  onApplySuggestion?: (suggestion: PlanSuggestion) => void;
}

export const PlanningConfigPanel = ({
  config,
  onConfigChange,
  onOptimize,
  suggestions = [],
  onApplySuggestion,
}: PlanningConfigPanelProps) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  const planningYear = config.timeframe.type === 'calendar-year' 
    ? (config.timeframe.year || new Date().getFullYear())
    : config.timeframe.startDate 
      ? new Date(config.timeframe.startDate).getFullYear()
      : new Date().getFullYear();
      
  const handlePTODaysChange = (days: number) => {
    if (days > 0) {
      setTotalPTODaysForYear(planningYear, days);
      setTotalPTODays(days);
      // Recalculate remaining days with carryover
      const remaining = getEffectiveAvailablePTODays(new Date(), planningYear);
      onConfigChange({ ...config, availablePTODays: remaining });
    } else {
      onConfigChange({ ...config, availablePTODays: days });
    }
  };
  
  const handleCarryoverChange = (days: number, expiryMonth: number) => {
    // Update carryover in config
    const carryover = days > 0 && expiryMonth > 0 ? { days, expiryMonth } : undefined;
    onConfigChange({ 
      ...config, 
      carryover,
      availablePTODays: getEffectiveAvailablePTODays(new Date(), planningYear)
    });
  };
  
  const handleTimeframeTypeChange = (type: TimeframeType) => {
    onConfigChange({
      ...config,
      timeframe: {
        ...config.timeframe,
        type,
      },
    });
  };
  
  const handleYearChange = (year: number) => {
    onConfigChange({
      ...config,
      timeframe: {
        ...config.timeframe,
        year,
      },
    });
  };
  
  const handleStartDateChange = (date: string) => {
    onConfigChange({
      ...config,
      timeframe: {
        ...config.timeframe,
        startDate: date,
      },
    });
  };
  
  const handleEndDateChange = (date: string) => {
    onConfigChange({
      ...config,
      timeframe: {
        ...config.timeframe,
        endDate: date,
      },
    });
  };
  
  const handleCompanyHolidayAdd = (holiday: CompanyHoliday) => {
    onConfigChange({
      ...config,
      companyHolidays: [...config.companyHolidays, holiday],
    });
  };
  
  const handleCompanyHolidayDelete = (id: string) => {
    onConfigChange({
      ...config,
      companyHolidays: config.companyHolidays.filter(h => h.id !== id),
    });
  };

  const handleApplyTemplate = (template: VacationTemplate) => {
    onConfigChange({
      ...config,
      strategy: template.strategy,
    });
  };
  
  const canOptimize = config.availablePTODays > 0;
  
  return (
    <div className="planning-config-panel">
      <h2>Set up your year</h2>
      <p className="config-subtitle">
        Tell us your PTO budget and timeframe — we’ll stretch it around public holidays.
      </p>
      
      <div className="config-steps">
        <div className="config-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <PTOInput
              value={config.availablePTODays}
              onChange={handlePTODaysChange}
              onCarryoverChange={handleCarryoverChange}
              showRemaining={true}
              planningYear={planningYear}
            />
          </div>
        </div>
        
        <div className="config-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <TimeframeSelector
              type={config.timeframe.type}
              year={config.timeframe.year}
              startDate={config.timeframe.startDate}
              endDate={config.timeframe.endDate}
              onTypeChange={handleTimeframeTypeChange}
              onYearChange={handleYearChange}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
            />
          </div>
        </div>
        
        <div className="config-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <CompanyHolidays
              holidays={config.companyHolidays}
              onAdd={handleCompanyHolidayAdd}
              onDelete={handleCompanyHolidayDelete}
            />
          </div>
        </div>
      </div>
      
      <div className="templates-toggle-section">
        <button type="button" className="templates-toggle-btn" onClick={() => setShowTemplates(!showTemplates)}>
          {showTemplates ? '▼' : '▶'} Vacation Templates
        </button>
        {showTemplates && (
          <TemplatePicker
            onApplyTemplate={handleApplyTemplate}
            currentStrategy={config.strategy}
            currentPreferredMonths={[]}
          />
        )}
      </div>
      
      <div className="templates-toggle-section">
        <button type="button" className="templates-toggle-btn" onClick={() => setShowWishlist(!showWishlist)}>
          {showWishlist ? '▼' : '▶'} Vacation Wishlist
        </button>
        {showWishlist && (
          <WishlistPanel
            suggestions={suggestions}
            onApplySuggestion={onApplySuggestion}
          />
        )}
      </div>

      <div className="optimize-section">
        <button
          onClick={onOptimize}
          disabled={!canOptimize}
          className="optimize-button"
        >
          Find my best breaks
        </button>
        {!canOptimize && (
          <p className="optimize-hint">Enter your available PTO days to continue</p>
        )}
      </div>
    </div>
  );
};

