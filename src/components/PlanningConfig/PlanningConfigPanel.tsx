import type { ReactNode } from 'react';
import { PTOInput } from './PTOInput';
import { TimeframeSelector, type TimeframeType } from './TimeframeSelector';
import { CompanyHolidays } from './CompanyHolidays';
import { TemplatePicker } from '../Templates/TemplatePicker';
import { WishlistPanel } from '../Wishlist/WishlistPanel';
import { setTotalPTODaysForYear, getEffectiveAvailablePTODays, getCarryover } from '../../services/ptoTracking';
import type { CompanyHoliday, PlanningConfig, VacationTemplate, PlanSuggestion } from '../../utils/types';
import './PlanningConfigPanel.css';

interface PlanningConfigPanelProps {
  config: PlanningConfig;
  locationFields?: ReactNode;
  advancedFields?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  actionHint?: string;
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
  locationFields,
  advancedFields,
  isLoading = false,
  disabled = false,
  actionHint,
}: PlanningConfigPanelProps) => {

  const planningYear = config.timeframe.type === 'calendar-year' 
    ? (config.timeframe.year || new Date().getFullYear())
    : config.timeframe.startDate 
      ? Number(config.timeframe.startDate.slice(0, 4))
      : new Date().getFullYear();
      
  const handlePTODaysChange = (days: number) => {
    setTotalPTODaysForYear(planningYear, days);
    onConfigChange({ ...config, availablePTODays: getEffectiveAvailablePTODays(new Date(), planningYear) });
  };

  const handleCarryoverChange = (days: number, expiryMonth: number) => {
    // Update carryover in config
    const carryover = days > 0 && expiryMonth > 0 ? { days, expiryMonth, year: planningYear } : undefined;
    onConfigChange({ 
      ...config, 
      carryover,
      availablePTODays: getEffectiveAvailablePTODays(new Date(), planningYear)
    });
  };
  
  const handleTimeframeTypeChange = (type: TimeframeType) => {
    const year = type === 'custom' && config.timeframe.startDate
      ? Number(config.timeframe.startDate.slice(0, 4)) : config.timeframe.year || new Date().getFullYear();
    onConfigChange({
      ...config,
      carryover: getCarryover(year),
      availablePTODays: getEffectiveAvailablePTODays(new Date(), year),
      timeframe: {
        ...config.timeframe,
        type,
      },
    });
  };
  
  const handleYearChange = (year: number) => {
    onConfigChange({
      ...config,
      carryover: getCarryover(year),
      availablePTODays: getEffectiveAvailablePTODays(new Date(), year),
      timeframe: {
        ...config.timeframe,
        type: 'calendar-year',
        year,
      },
    });
  };
  
  const handleStartDateChange = (date: string) => {
    const year = Number(date.slice(0, 4)) || planningYear;
    onConfigChange({
      ...config,
      carryover: getCarryover(year),
      availablePTODays: getEffectiveAvailablePTODays(new Date(), year),
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
  
  const hasPTO = getEffectiveAvailablePTODays(new Date(), planningYear) > 0;
  const canOptimize = hasPTO && !disabled && !isLoading;
  const currentYear = new Date().getFullYear();
  const years = [...new Set([planningYear, ...Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)])].sort((a, b) => a - b);

  return (
    <section className="planning-config-panel" aria-labelledby="planning-setup-title">
      <h2 id="planning-setup-title">Plan your next break</h2>
      <p className="config-subtitle">Make the most of your days off.</p>

      <div className="config-essential-fields">
        {locationFields && <div className="config-location-field">{locationFields}</div>}
        <div className="config-year-field">
          <label htmlFor="planning-year">Year</label>
          <select id="planning-year" value={planningYear} onChange={event => handleYearChange(Number(event.target.value))}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <PTOInput
          mode="annual"
          value={config.availablePTODays}
          onChange={handlePTODaysChange}
          planningYear={planningYear}
        />
      </div>
      {config.timeframe.type === 'custom' && (
        <p className="config-range-hint">Using custom dates from More options. Choosing a year above returns to the full year.</p>
      )}

      <div className="optimize-section">
        <button type="button" onClick={onOptimize} disabled={!canOptimize} className="optimize-button" aria-describedby={!hasPTO || actionHint ? 'optimize-hint' : undefined}>
          {isLoading ? 'Finding breaks…' : 'Find breaks'}
        </button>
        {(!hasPTO || actionHint) && <p id="optimize-hint" className="optimize-hint">{actionHint || 'Add your PTO allowance to find a break.'}</p>}
      </div>

      <details className="config-more-options">
        <summary>More options</summary>
        <div className="config-advanced-fields">
          {advancedFields}
          <section className="config-option-group">
            <h3>Carryover</h3>
            <PTOInput
              mode="carryover"
              value={config.availablePTODays}
              onChange={handlePTODaysChange}
              onCarryoverChange={handleCarryoverChange}
              planningYear={planningYear}
            />
          </section>
          <section className="config-option-group">
            <TimeframeSelector
              type={config.timeframe.type}
              year={config.timeframe.year}
              startDate={config.timeframe.startDate}
              endDate={config.timeframe.endDate}
              showYearSelect={false}
              onTypeChange={handleTimeframeTypeChange}
              onYearChange={handleYearChange}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
            />
          </section>
          <section className="config-option-group">
            <CompanyHolidays holidays={config.companyHolidays} onAdd={handleCompanyHolidayAdd} onDelete={handleCompanyHolidayDelete} />
          </section>
          <section className="config-option-group">
            <TemplatePicker onApplyTemplate={handleApplyTemplate} currentStrategy={config.strategy} currentPreferredMonths={[]} />
          </section>
          <section className="config-option-group">
            <WishlistPanel suggestions={suggestions} onApplySuggestion={onApplySuggestion} />
          </section>
        </div>
      </details>


    </section>
  );
};
