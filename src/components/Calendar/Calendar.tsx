import { useState } from 'react';
import { addMonths, subMonths, startOfMonth, parseISO } from 'date-fns';
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
  initialMonth?: Date;
  focusOnDates?: string[];
  workDays?: number[];
  readOnly?: boolean;
}

export const Calendar = (props: CalendarProps) => {
  const firstDate = [...(props.focusOnDates || [])].sort()[0] || '';
  return <CalendarView key={`${props.year}-${firstDate}-${props.initialMonth?.getTime() || ''}`} {...props} />;
};

const CalendarView = ({
  selectedDates,
  suggestedDates,
  holidays,
  companyHolidays = [],
  onDateClick,
  year,
  initialMonth,
  focusOnDates,
  workDays = [1, 2, 3, 4, 5],
  readOnly = false,
}: CalendarProps) => {
  const getInitialMonth = () => {
    if (initialMonth) {
      return startOfMonth(initialMonth);
    }
    if (focusOnDates && focusOnDates.length > 0) {
      const sortedDates = [...focusOnDates].sort();
      const firstDate = parseISO(sortedDates[0]);
      return startOfMonth(firstDate);
    }
    return new Date(year, year === new Date().getFullYear() ? new Date().getMonth() : 0, 1);
  };

  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  const [viewMode, setViewMode] = useState<'single' | 'triple' | 'agenda'>('single');

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
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
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
          <button onClick={handlePreviousMonth} className="nav-button" title="Previous month" aria-label="Previous month">
            ←
          </button>
          <select
            aria-label="Calendar month"
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
          <button onClick={handleNextMonth} className="nav-button" title="Next month" aria-label="Next month">
            →
          </button>
          <button disabled={year !== new Date().getFullYear()} onClick={handleToday} className="nav-button today-button" title="Go to today">
            Today
          </button>
        </div>
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('single')}
            aria-pressed={viewMode === 'single'}
            className={`view-button ${viewMode === 'single' ? 'active' : ''}`}
            title="Single month view"
          >
            1 Month
          </button>
          <button
            onClick={() => setViewMode('triple')}
            aria-pressed={viewMode === 'triple'}
            className={`view-button ${viewMode === 'triple' ? 'active' : ''}`}
            title="Three months view"
          >
            3 Months
          </button>
          <button type="button" aria-pressed={viewMode === 'agenda'} onClick={() => setViewMode('agenda')} className={`view-button ${viewMode === 'agenda' ? 'active' : ''}`}>Agenda</button>
        </div>
      </div>
      {viewMode === 'agenda' ? (
        <div className="calendar-agenda" aria-label="Leave and holidays">
          {[...new Set([...selectedDates, ...holidays.map(h => h.date), ...companyHolidays.map(h => h.date)])].sort().map(date => (
            <p key={date}><time dateTime={date}>{parseISO(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time> — {[selectedDates.includes(date) ? 'Selected leave' : '', ...holidays.filter(h => h.date === date).map(h => h.localName), ...companyHolidays.filter(h => h.date === date).map(h => h.name)].filter(Boolean).join(', ')}</p>
          ))}
          {selectedDates.length + holidays.length + companyHolidays.length === 0 && <p>No leave or holidays to display.</p>}
        </div>
      ) : <div className="calendar-months">
        {months.map((month) => (
          <CalendarMonth
            key={`${month.getFullYear()}-${month.getMonth()}`}
            date={month}
            workDays={workDays}
            readOnly={readOnly}
            onNavigateDate={(date) => {
              setCurrentMonth(startOfMonth(date));
              requestAnimationFrame(() => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                document.querySelector<HTMLButtonElement>(`[data-calendar-date="${key}"]`)?.focus();
              });
            }}
            selectedDates={selectedDates}
            suggestedDates={suggestedDates}
            holidays={holidays}
            companyHolidays={companyHolidays}
            onDateClick={onDateClick}
          />
        ))}
      </div>}
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
          <span>Non-working day</span>
        </div>
      </div>
    </div>
  );
};

