import './TimeframeSelector.css';

export type TimeframeType = 'calendar-year' | 'custom';

interface TimeframeSelectorProps {
  type: TimeframeType;
  year?: number;
  showYearSelect?: boolean;
  startDate?: string;
  endDate?: string;
  onTypeChange: (type: TimeframeType) => void;
  onYearChange: (year: number) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const TimeframeSelector = ({
  type,
  year,
  showYearSelect = true,
  startDate,
  endDate,
  onTypeChange,
  onYearChange,
  onStartDateChange,
  onEndDateChange,
}: TimeframeSelectorProps) => {
  const currentYear = new Date().getFullYear();
  // Support current-1 through current+3 (5 years total)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
  
  return (
    <div className="timeframe-selector">
      <label htmlFor="planning-timeframe" className="timeframe-label">Dates to consider</label>
      <select id="planning-timeframe" value={type} onChange={event => onTypeChange(event.target.value as TimeframeType)} className="year-select">
        <option value="calendar-year">Full calendar year</option>
        <option value="custom">Custom date range</option>
      </select>
      {type === 'calendar-year' && showYearSelect && (
        <select aria-label="Planning year" value={year || currentYear} onChange={event => onYearChange(Number(event.target.value))} className="year-select">
          {years.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      )}
      {type === 'custom' && (
        <div className="custom-dates">
          <div className="date-input-group">
            <label htmlFor="planning-start">Start date</label>
            <input type="date" id="planning-start" value={startDate || ''} onChange={event => onStartDateChange(event.target.value)} className="date-input" />
          </div>
          <div className="date-input-group">
            <label htmlFor="planning-end">End date</label>
            <input type="date" id="planning-end" value={endDate || ''} onChange={event => onEndDateChange(event.target.value)} className="date-input" min={startDate || undefined} />
          </div>
        </div>
      )}
    </div>
  );
};
