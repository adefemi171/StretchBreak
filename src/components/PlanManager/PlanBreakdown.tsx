import { formatDateDisplay, isWeekendDay } from '../../utils/dateUtils';
import type { HolidayPlan, PublicHoliday } from '../../utils/types';
import { eachDayOfInterval, parseISO, subDays, addDays, isWeekend, format } from 'date-fns';
import './PlanBreakdown.css';

interface PlanBreakdownProps {
  plan: HolidayPlan;
  holidays: PublicHoliday[];
}

export const PlanBreakdown = ({ plan, holidays }: PlanBreakdownProps) => {
  if (plan.vacationDays.length === 0) {
    return null;
  }

  // Get date range from first to last vacation day
  const sortedDates = [...plan.vacationDays].sort();
  let startDate = parseISO(sortedDates[0]);
  let endDate = parseISO(sortedDates[sortedDates.length - 1]);
  
  // Extend range to include adjacent holidays and weekends that create continuous break
  // Check for holidays/weekends immediately before the first vacation day
  let checkDate = subDays(startDate, 1);
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date === dateStr);
    const isWeekendDay = isWeekend(checkDate);
    
    if (isHoliday || isWeekendDay) {
      startDate = checkDate;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  // Check for holidays/weekends immediately after the last vacation day
  checkDate = addDays(endDate, 1);
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date === dateStr);
    const isWeekendDay = isWeekend(checkDate);
    
    if (isHoliday || isWeekendDay) {
      endDate = checkDate;
      checkDate = addDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  // Get all days in the extended range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Separate vacation days (weekdays) from holidays and weekends
  const vacationDaysList: string[] = [];
  const holidaysInPeriod: PublicHoliday[] = [];
  const weekendsInPeriod: string[] = [];

  for (const day of allDays) {
    const dateStr = day.toISOString().split('T')[0];
    const isHoliday = holidays.find(h => h.date === dateStr);
    const isWeekend = isWeekendDay(day);
    const isVacationDay = plan.vacationDays.includes(dateStr);

    // Public holidays in the period
    if (isHoliday) {
      holidaysInPeriod.push(isHoliday);
    }
    
    // Weekends in the period (not already counted as vacation days)
    if (isWeekend && !isVacationDay) {
      weekendsInPeriod.push(dateStr);
    }
    
    // Vacation days (weekdays that need to be taken off)
    if (isVacationDay && !isWeekend && !isHoliday) {
      vacationDaysList.push(dateStr);
    }
  }

  const totalDaysOff = vacationDaysList.length + holidaysInPeriod.length + weekendsInPeriod.length;

  return (
    <div className="plan-breakdown">
      <h3>Plan Breakdown: {plan.name}</h3>
      <div className="breakdown-summary">
        <div className="summary-item">
          <span className="summary-label">Vacation Days (to take off):</span>
          <span className="summary-value highlight">{vacationDaysList.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Public Holidays:</span>
          <span className="summary-value holiday">{holidaysInPeriod.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Weekends:</span>
          <span className="summary-value weekend">{weekendsInPeriod.length}</span>
        </div>
        <div className="summary-item total">
          <span className="summary-label">Total Days Off:</span>
          <span className="summary-value">{totalDaysOff}</span>
        </div>
      </div>

      <div className="breakdown-details">
        <div className="breakdown-section">
          <h4>📅 Vacation Days (Take Off)</h4>
          <div className="dates-list">
            {vacationDaysList.length > 0 ? (
              vacationDaysList.map(date => (
                <div key={date} className="date-item vacation">
                  {formatDateDisplay(date)}
                </div>
              ))
            ) : (
              <p className="no-dates">No vacation days in this period</p>
            )}
          </div>
        </div>

        <div className="breakdown-section">
          <h4>🎉 Public Holidays</h4>
          <div className="dates-list">
            {holidaysInPeriod.length > 0 ? (
              holidaysInPeriod.map(holiday => (
                <div key={holiday.date} className="date-item holiday">
                  <span className="holiday-date">{formatDateDisplay(holiday.date)}</span>
                  <span className="holiday-name">{holiday.localName}</span>
                </div>
              ))
            ) : (
              <p className="no-dates">No public holidays in this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

