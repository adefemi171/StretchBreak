import { formatDateDisplay, isWeekendDay } from '../../utils/dateUtils';
import { detectPlanOverlaps } from '../../utils/planOverlap';
import { analyzeConflicts } from '../../utils/conflictDetection';
import { getAllPlans } from '../../services/planStorage';
import type { HolidayPlan, PublicHoliday } from '../../utils/types';
import { eachDayOfInterval, parseISO, format } from 'date-fns';
import { getVacationBreaks } from '../../utils/planningAlgorithm';
import './PlanBreakdown.css';

interface PlanBreakdownProps {
  plan: HolidayPlan;
  holidays: PublicHoliday[];
}

export const PlanBreakdown = ({ plan, holidays }: PlanBreakdownProps) => {
  if (plan.vacationDays.length === 0) {
    return null;
  }

  const allHolidays = [...plan.publicHolidays, ...(plan.companyHolidays ?? []).map(h => ({ ...h, localName: h.name }))];
  const breaks = getVacationBreaks(plan.vacationDays, allHolidays, plan.workDays);
  const vacationDaysList = breaks.flatMap(period => period.leaveDates);
  const datesOff = new Set(breaks.flatMap(period => eachDayOfInterval({ start: parseISO(period.startDate), end: parseISO(period.endDate) }).map(date => format(date, 'yyyy-MM-dd'))));
  const holidayByDate = new Map(allHolidays.map(holiday => [holiday.date, holiday]));
  const holidaysInPeriod = [...holidayByDate.values()].filter(holiday => datesOff.has(holiday.date));
  const weekendsInPeriod = [...datesOff].filter(date => isWeekendDay(date, plan.workDays) && !holidayByDate.has(date));
  const totalDaysOff = datesOff.size;

  const allPlans = getAllPlans();
  const overlapInfo = detectPlanOverlaps(plan, allPlans);
  const hasOverlaps = overlapInfo.overlapCount > 0;
  
  // Get used dates from all plans (excluding current plan)
  const usedDates = new Set<string>();
  allPlans.forEach(p => {
    if (p.id !== plan.id) {
      p.vacationDays.forEach(day => {
        if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
          usedDates.add(day.trim());
        }
      });
    }
  });
  
  // Use the plan's own holiday lists to avoid false positives from live country/region switches
  const conflictAnalysis = analyzeConflicts(
    plan.vacationDays,
    plan.publicHolidays?.length ? plan.publicHolidays : holidays,
    plan.companyHolidays || [],
    usedDates,
    plan.workDays
  );

  return (
    <div className="plan-breakdown">
      <h3>Plan Breakdown: {plan.name}</h3>
      
      {conflictAnalysis.hasConflicts && (
        <div className="breakdown-holiday-warning">
          <div className="breakdown-warning-header">
            <span className="breakdown-warning-text">
              {conflictAnalysis.holidayConflicts.length} selected day{conflictAnalysis.holidayConflicts.length !== 1 ? 's' : ''} also {conflictAnalysis.holidayConflicts.length === 1 ? 'is' : 'are'} a holiday — free that PTO if it was unintentional
            </span>
          </div>
          <div className="breakdown-conflict-list">
            {conflictAnalysis.holidayConflicts.map(conflict => (
              <div key={conflict.vacationDate} className="breakdown-conflict-item">
                <span className="conflict-date">{formatDateDisplay(conflict.vacationDate)}</span>
                <span className="conflict-name">
                  {'localName' in conflict.conflictingHoliday 
                    ? conflict.conflictingHoliday.localName 
                    : conflict.conflictingHoliday.name}
                  {conflict.type === 'company' ? ' (company)' : ''}
                </span>
              </div>
            ))}
          </div>
          {conflictAnalysis.alternativeDates.length > 0 && (
            <div className="breakdown-alternatives">
              <span className="alternatives-label">Nearby options:</span>
              <div className="alternatives-list">
                {conflictAnalysis.alternativeDates.map(altDate => (
                  <span key={altDate} className="alternative-date">
                    {formatDateDisplay(altDate)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {hasOverlaps && (
        <div className="breakdown-overlap-warning">
          <div className="breakdown-overlap-header">
            <span className="breakdown-overlap-text">
              {overlapInfo.overlapCount} date{overlapInfo.overlapCount !== 1 ? 's' : ''} in this plan overlap with other saved plans
            </span>
          </div>
          <div className="breakdown-overlapping-plans">
            <span className="breakdown-overlap-label">Overlaps with:</span>
            <div className="breakdown-overlap-plan-names">
              {overlapInfo.overlappingPlans.map(overlapPlan => (
                <span key={overlapPlan.planId} className="breakdown-overlap-plan-name">
                  {overlapPlan.planName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <p>{breaks.map(period => `${formatDateDisplay(period.startDate)} – ${formatDateDisplay(period.endDate)}`).join("; ")}</p>
      <div className="breakdown-summary">
        <div className="summary-item">
          <span className="summary-label">Vacation Days (to take off):</span>
          <span className="summary-value highlight">{vacationDaysList.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Public / Employer Holidays:</span>
          <span className="summary-value holiday">{holidaysInPeriod.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Other Rest Days:</span>
          <span className="summary-value weekend">{weekendsInPeriod.length}</span>
        </div>
        <div className="summary-item total">
          <span className="summary-label">Total Days Off:</span>
          <span className="summary-value">{totalDaysOff}</span>
        </div>
      </div>

      <div className="breakdown-details">
        <div className="breakdown-section">
          <h4>Vacation Days (Take Off)</h4>
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
          <h4>Public / Employer Holidays</h4>
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

