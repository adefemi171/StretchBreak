import './TimeframeSelector.css';

export type TimeframeType = 'calendar-year' | 'custom';

interface TimeframeSelectorProps {
  type: TimeframeType;
  year?: number;
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
  startDate,
  endDate,
  onTypeChange,
  onYearChange,
  onStartDateChange,
  onEndDateChange,
}: TimeframeSelectorProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);
  
  return (
    <div className="timeframe-selector">
      <label className="timeframe-label">Select Your Timeframe</label>
      <p className="timeframe-subtitle">
        Choose the time period you want to plan for
      </p>
      
      <div className="timeframe-options">
        <div
          className={`timeframe-option ${type === 'calendar-year' ? 'selected' : ''}`}
          onClick={() => onTypeChange('calendar-year')}
        >
          <input
            type="radio"
            name="timeframe"
            checked={type === 'calendar-year'}
            onChange={() => onTypeChange('calendar-year')}
          />
          <div className="timeframe-content">
            <div className="timeframe-name">Calendar Year</div>
            <div className="timeframe-description">Plan for a full calendar year (Jan 1 - Dec 31)</div>
            {type === 'calendar-year' && (
              <select
                value={year || currentYear}
                onChange={(e) => onYearChange(parseInt(e.target.value))}
                className="year-select"
                onClick={(e) => e.stopPropagation()}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <div
          className={`timeframe-option ${type === 'custom' ? 'selected' : ''}`}
          onClick={() => onTypeChange('custom')}
        >
          <input
            type="radio"
            name="timeframe"
            checked={type === 'custom'}
            onChange={() => onTypeChange('custom')}
          />
          <div className="timeframe-content">
            <div className="timeframe-name">12-Month Period</div>
            <div className="timeframe-description">Choose your start month and year</div>
            {type === 'custom' && (
              <div className="custom-dates">
                <div className="date-input-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate || ''}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="date-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

