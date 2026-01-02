import type { PublicHoliday, CompanyHoliday } from '../../utils/types';
import './CalendarDay.css';

interface CalendarDayProps {
  date: Date | null;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isSuggested: boolean;
  isPublicHoliday: boolean;
  isCompanyHoliday: boolean;
  isWeekend: boolean;
  holiday?: PublicHoliday;
  companyHoliday?: CompanyHoliday;
  onClick: (date: Date) => void;
}

export const CalendarDay = ({
  date,
  isCurrentMonth,
  isSelected,
  isSuggested,
  isPublicHoliday,
  isCompanyHoliday,
  isWeekend,
  holiday,
  companyHoliday,
  onClick,
}: CalendarDayProps) => {
  if (!date) {
    return <div className="calendar-day empty" />;
  }
  
  const handleClick = () => {
    if (isCurrentMonth && !isPublicHoliday && !isCompanyHoliday && !isWeekend) {
      onClick(date);
    }
  };
  
  const dayNumber = date.getDate();
  const classes = [
    'calendar-day',
    !isCurrentMonth && 'other-month',
    isSelected && 'selected',
    isSuggested && 'suggested',
    isPublicHoliday && 'holiday',
    isCompanyHoliday && 'company-holiday',
    isWeekend && 'weekend',
    isCurrentMonth && !isPublicHoliday && !isCompanyHoliday && !isWeekend && 'selectable',
  ]
    .filter(Boolean)
    .join(' ');
  
  return (
    <div className={classes} onClick={handleClick}>
      <div className="day-number">{dayNumber}</div>
      {holiday && (
        <div className="holiday-name" title={`${holiday.localName} (${holiday.name})`}>
          {holiday.localName.length > 12 
            ? holiday.localName.substring(0, 10) + '...' 
            : holiday.localName}
        </div>
      )}
      {companyHoliday && !holiday && (
        <div className="company-holiday-name" title={companyHoliday.name}>
          {companyHoliday.name.length > 12 
            ? companyHoliday.name.substring(0, 10) + '...' 
            : companyHoliday.name}
        </div>
      )}
      {isSelected && (
        <div className="selected-indicator">✓</div>
      )}
    </div>
  );
};

