import { PTOInput } from './PTOInput';
import { TimeframeSelector, type TimeframeType } from './TimeframeSelector';
import { CompanyHolidays } from './CompanyHolidays';
import { setTotalPTODays, getRemainingPTODays } from '../../services/ptoTracking';
import type { CompanyHoliday, PlanningConfig } from '../../utils/types';
import './PlanningConfigPanel.css';

interface PlanningConfigPanelProps {
  config: PlanningConfig;
  holidays: unknown[];
  countryCode: string;
  onConfigChange: (config: PlanningConfig) => void;
  onOptimize: () => void;
}

export const PlanningConfigPanel = ({
  config,
  onConfigChange,
  onOptimize,
}: PlanningConfigPanelProps) => {
  const handlePTODaysChange = (days: number) => {
    // Always replace Total PTO when updated (not add)
    if (days > 0) {
      setTotalPTODays(days);
      // Recalculate remaining days
      const remaining = getRemainingPTODays();
      onConfigChange({ ...config, availablePTODays: remaining });
    } else {
      onConfigChange({ ...config, availablePTODays: days });
    }
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
  
  const canOptimize = config.availablePTODays > 0;
  
  return (
    <div className="planning-config-panel">
      <h2>Plan Your Year</h2>
      <p className="config-subtitle">
        Complete these steps to optimize your time off throughout the year
      </p>
      
      <div className="config-steps">
        <div className="config-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <PTOInput
              value={config.availablePTODays}
              onChange={handlePTODaysChange}
              showRemaining={true}
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
      
      <div className="optimize-section">
        <button
          onClick={onOptimize}
          disabled={!canOptimize}
          className="optimize-button"
        >
          Optimize My Time Off
        </button>
        {!canOptimize && (
          <p className="optimize-hint">Please enter your available PTO days to continue</p>
        )}
      </div>
    </div>
  );
};

