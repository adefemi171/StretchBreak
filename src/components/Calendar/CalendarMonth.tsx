import { getCalendarDays, formatDate, isWeekendDay, isSameDate } from '../../utils/dateUtils';
import type { PublicHoliday, CompanyHoliday } from '../../utils/types';
import { CalendarDay } from './CalendarDay';
import './CalendarMonth.css';

interface CalendarMonthProps {
  date: Date;
  selectedDates: string[];
  suggestedDates: string[];
  holidays: PublicHoliday[];
  companyHolidays?: CompanyHoliday[];
  onDateClick: (date: Date) => void;
}

export const CalendarMonth = ({
  date,
  selectedDates,
  suggestedDates,
  holidays,
  companyHolidays = [],
  onDateClick,
}: CalendarMonthProps) => {
  const calendarDays = getCalendarDays(date);
  const currentMonth = date.getMonth();
  
  const isDateSelected = (dayDate: Date): boolean => {
    return selectedDates.some(selected => isSameDate(selected, dayDate));
  };
  
  const isDateSuggested = (dayDate: Date): boolean => {
    return suggestedDates.some(suggested => isSameDate(suggested, dayDate));
  };
  
  const getHolidayForDate = (dayDate: Date): PublicHoliday | undefined => {
    return holidays.find(h => isSameDate(h.date, dayDate));
  };
  
  const getCompanyHolidayForDate = (dayDate: Date): CompanyHoliday | undefined => {
    return companyHolidays.find(h => isSameDate(h.date, dayDate));
  };
  
  const isCompanyHoliday = (dayDate: Date): boolean => {
    return companyHolidays.some(h => isSameDate(h.date, dayDate));
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="calendar-month">
      <div className="calendar-header">
        <h3>{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
      </div>
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <CalendarDay key={`empty-${index}`} date={null} isCurrentMonth={false} isSelected={false} isSuggested={false} isPublicHoliday={false} isCompanyHoliday={false} isWeekend={false} onClick={() => {}} />;
            }
            
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isSelected = isDateSelected(day);
            const isSuggested = isDateSuggested(day);
            const holiday = getHolidayForDate(day);
            const companyHoliday = getCompanyHolidayForDate(day);
            const isPublicHoliday = !!holiday;
            const isCompanyHolidayDay = isCompanyHoliday(day);
            const isWeekend = isWeekendDay(day);
            
            return (
              <CalendarDay
                key={formatDate(day)}
                date={day}
                isCurrentMonth={isCurrentMonth}
                isSelected={isSelected}
                isSuggested={isSuggested}
                isPublicHoliday={isPublicHoliday}
                isCompanyHoliday={isCompanyHolidayDay}
                isWeekend={isWeekend}
                holiday={holiday}
                companyHoliday={companyHoliday}
                onClick={onDateClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

