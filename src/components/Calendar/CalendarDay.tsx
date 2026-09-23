import type { KeyboardEvent } from 'react';
import type { PublicHoliday, CompanyHoliday } from '../../utils/types';
import './CalendarDay.css';

interface CalendarDayProps {
  date: Date | null;
  tabIndex?: number;
  readOnly?: boolean;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
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
  tabIndex = -1,
  readOnly = false,
  onFocus,
  onKeyDown,
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
    if (!readOnly && isCurrentMonth && !isPublicHoliday && !isCompanyHoliday && !isWeekend) {
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
    <button type="button" className={classes} onClick={handleClick}
      tabIndex={tabIndex} onFocus={onFocus} onKeyDown={onKeyDown}
      data-calendar-date={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
      aria-pressed={isSelected}
      aria-disabled={readOnly || !isCurrentMonth || isPublicHoliday || isCompanyHoliday || isWeekend}
      aria-label={[date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), holiday?.localName, companyHoliday?.name, isWeekend ? 'Non-working day' : '', isSelected ? 'Selected leave day' : '', readOnly ? 'Read only' : ''].filter(Boolean).join(', ')}>

      <div className="day-number">{dayNumber}</div>
      {holiday && (
        <div className="holiday-name" title={`${holiday.localName} (${holiday.name})`}>
          {holiday.localName}
        </div>
      )}
      {companyHoliday && !holiday && (
        <div className="company-holiday-name" title={companyHoliday.name}>
          {companyHoliday.name}
        </div>
      )}
      {isSelected && (
        <div className="selected-indicator" aria-hidden="true" />
      )}
    </button>
  );
};

