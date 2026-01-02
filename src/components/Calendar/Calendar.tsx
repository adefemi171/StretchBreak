import { useState } from 'react';
import { addMonths, subMonths } from 'date-fns';
import type { PublicHoliday, CompanyHoliday } from '../../utils/types';
import { CalendarMonth } from './CalendarMonth';
import './Calendar.css';

interface CalendarProps {
  selectedDates: string[];
  suggestedDates: string[];
  holidays: PublicHoliday[];
  companyHolidays?: CompanyHoliday[];
  onDateClick: (date: Date) => void;
  year: number;
}

export const Calendar = ({
  selectedDates,
  suggestedDates,
  holidays,
  companyHolidays = [],
  onDateClick,
  year,
}: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(year, 0, 1));
  const [viewMode, setViewMode] = useState<'single' | 'triple'>('single');
  
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const handleToday = () => {
    setCurrentMonth(new Date());
  };
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = parseInt(e.target.value);
    setCurrentMonth(new Date(year, monthIndex, 1));
  };
  
  // Show 1 or 3 months based on view mode
  const months = viewMode === 'single'
    ? [currentMonth]
    : [
        currentMonth,
        addMonths(currentMonth, 1),
        addMonths(currentMonth, 2),
      ];
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return (
    <div className="calendar-container">
      <div className="calendar-controls">
        <div className="calendar-nav-group">
          <button onClick={handlePreviousMonth} className="nav-button" title="Previous month">
            ←
          </button>
          <select
            value={currentMonth.getMonth()}
            onChange={handleMonthChange}
            className="month-select"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index}>
                {name} {currentMonth.getFullYear()}
              </option>
            ))}
          </select>
          <button onClick={handleNextMonth} className="nav-button" title="Next month">
            →
          </button>
          <button onClick={handleToday} className="nav-button today-button" title="Go to today">
            Today
          </button>
        </div>
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('single')}
            className={`view-button ${viewMode === 'single' ? 'active' : ''}`}
            title="Single month view"
          >
            1 Month
          </button>
          <button
            onClick={() => setViewMode('triple')}
            className={`view-button ${viewMode === 'triple' ? 'active' : ''}`}
            title="Three months view"
          >
            3 Months
          </button>
        </div>
      </div>
      <div className="calendar-months">
        {months.map((month) => (
          <CalendarMonth
            key={`${month.getFullYear()}-${month.getMonth()}`}
            date={month}
            selectedDates={selectedDates}
            suggestedDates={suggestedDates}
            holidays={holidays}
            companyHolidays={companyHolidays}
            onDateClick={onDateClick}
          />
        ))}
      </div>
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color holiday"></div>
          <span>Public Holiday</span>
        </div>
        <div className="legend-item">
          <div className="legend-color suggested"></div>
          <span>Suggested</span>
        </div>
        <div className="legend-item">
          <div className="legend-color selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-color company-holiday"></div>
          <span>Company Holiday</span>
        </div>
        <div className="legend-item">
          <div className="legend-color weekend"></div>
          <span>Weekend</span>
        </div>
      </div>
    </div>
  );
};

