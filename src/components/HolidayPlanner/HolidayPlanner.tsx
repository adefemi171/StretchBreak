import { useState, type ReactNode } from 'react';
import { format, startOfDay } from 'date-fns';
import { Calendar } from '../Calendar/Calendar';
import { PlanSuggestions } from './PlanSuggestions';
import { StrategySelector } from '../PlanningConfig/StrategySelector';
import { getLeaveDates, normalizeSuggestion } from '../../utils/planningAlgorithm';
import { formatDate } from '../../utils/dateUtils';
import type { PublicHoliday, PlanSuggestion, CompanyHoliday, VacationStrategy } from '../../utils/types';
import './HolidayPlanner.css';

interface HolidayPlannerProps {
  holidays: PublicHoliday[];
  workDays?: number[];
  companyHolidays?: CompanyHoliday[];
  year: number;
  holidaysLoading?: boolean;
  extraOptions?: ReactNode;
  suggestions?: PlanSuggestion[];
  selectedDates?: string[];
  onDateChange?: (dates: string[]) => void;
  focusOnDates?: string[];
  strategy?: string;
  availablePTODays?: number;
  usedStrategies?: string[];
  onStrategyChange?: (strategy: VacationStrategy) => void;
  onApplyStrategy?: (strategy: VacationStrategy) => void;
  onAutoSave?: (plan: { name: string; vacationDays: string[]; strategy?: string; availablePTODays?: number }) => void;
}

export const HolidayPlanner = ({
  holidays,
  workDays,
  companyHolidays = [],
  year,
  holidaysLoading = false,
  extraOptions,
  suggestions: externalSuggestions = [],
  selectedDates: externalSelectedDates = [],
  onDateChange,
  focusOnDates,
  strategy,
  availablePTODays,
  usedStrategies = [],
  onStrategyChange,
  onApplyStrategy,
}: HolidayPlannerProps) => {
  const [internalSelectedDates, setInternalSelectedDates] = useState<string[]>([]);
  const selectedDates = onDateChange ? externalSelectedDates : internalSelectedDates;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appliedFocus, setAppliedFocus] = useState<{ dates: string[]; external?: string[] } | null>(null);

  const allHolidays: PublicHoliday[] = [...holidays, ...companyHolidays.map(holiday => ({
    date: holiday.date, name: holiday.name, localName: holiday.name, countryCode: holiday.countryCode ?? '',
    fixed: false, global: true, counties: null, launchYear: null, types: ['Company'],
  }))];
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
  // The parent owns budget, timeframe and strategy. Never replace an empty constrained result with a fallback.
  const allSuggestions = holidaysLoading ? [] : externalSuggestions
    .map(suggestion => normalizeSuggestion(suggestion, allHolidays, workDays))
    .filter((suggestion): suggestion is PlanSuggestion => suggestion !== null)
    .filter(suggestion => suggestion.startDate >= today &&
      (availablePTODays === undefined || suggestion.vacationDaysUsed <= availablePTODays));
  const suggestedDates = allSuggestions.slice(0, 3).flatMap(suggestion => suggestion.leaveDates ?? []);

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    const newDates = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr].sort();
    
    if (onDateChange) {
      onDateChange(newDates);
    } else {
      setInternalSelectedDates(newDates);
    }
  };
  
  const handleApplySuggestion = (suggestion: PlanSuggestion) => {
    const sortedDates = getLeaveDates(suggestion.startDate, suggestion.endDate, allHolidays, workDays);
    if (!sortedDates.length) return;
    setAppliedFocus({ dates: sortedDates, external: focusOnDates });
    setCalendarOpen(false);
    if (onDateChange) onDateChange(sortedDates);
    else setInternalSelectedDates(sortedDates);
    requestAnimationFrame(() => document.getElementById('review-heading')?.focus({ preventScroll: true }));
  };

  const handleChooseAnother = () => {
    setCalendarOpen(false);
    setAppliedFocus(null);
    if (onDateChange) onDateChange([]);
    else setInternalSelectedDates([]);
    requestAnimationFrame(() => document.getElementById('break-choices-heading')?.focus({ preventScroll: true }));
  };

  return (
    <div className="holiday-planner">
      {selectedDates.length === 0 ? (
        <>
          {holidaysLoading ? <p role="status">Finding breaks around your holidays…</p> : (
            <PlanSuggestions
              suggestions={allSuggestions}
              onApplySuggestion={handleApplySuggestion}
              extraOptions={onStrategyChange || extraOptions ? (
                <>
                  {onStrategyChange && (
                    <div className="strategy-selector-section">
                      <StrategySelector
                        value={strategy as VacationStrategy | undefined}
                        onChange={onStrategyChange}
                        disabledStrategies={usedStrategies}
                        onApplyStrategy={onApplyStrategy}
                      />
                    </div>
                  )}
                  {extraOptions}
                </>
              ) : undefined}
            />
          )}
        </>
      ) : (
        <button type="button" className="ghost-button choose-another-break" onClick={handleChooseAnother}>
          Choose another break
        </button>
      )}
      <div className="manual-date-options">
        <button
          type="button"
          className="calendar-disclosure-button"
          aria-expanded={calendarOpen}
          aria-controls="break-date-calendar"
          onClick={() => setCalendarOpen(open => !open)}
        >
          {calendarOpen ? 'Close calendar' : selectedDates.length > 0 ? 'Adjust dates' : 'Choose my own dates'}
        </button>
        <div id="break-date-calendar" hidden={!calendarOpen}>
          <p className="calendar-help">Select the workdays you want to take off. Select a date again to remove it.</p>
          <Calendar
            selectedDates={selectedDates}
            suggestedDates={suggestedDates}
            holidays={holidays}
            companyHolidays={companyHolidays}
            onDateClick={handleDateClick}
            year={year}
            focusOnDates={appliedFocus?.external === focusOnDates ? appliedFocus?.dates : focusOnDates}
            workDays={workDays}
          />
        </div>
      </div>
    </div>
  );
};
