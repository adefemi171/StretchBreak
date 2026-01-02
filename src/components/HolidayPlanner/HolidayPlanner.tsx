import { useState, useEffect, useRef } from 'react';
import { eachDayOfInterval, isSameDay, isPast, parseISO, startOfDay } from 'date-fns';
import { Calendar } from '../Calendar/Calendar';
import { PlanSuggestions } from './PlanSuggestions';
import { findOptimalVacationPeriods } from '../../utils/planningAlgorithm';
import { formatDate, parseDateString } from '../../utils/dateUtils';
import type { PublicHoliday, PlanSuggestion, CompanyHoliday } from '../../utils/types';
import './HolidayPlanner.css';

interface HolidayPlannerProps {
  holidays: PublicHoliday[];
  companyHolidays?: CompanyHoliday[];
  year: number;
  suggestions?: PlanSuggestion[];
  selectedDates?: string[];
  onDateChange?: (dates: string[]) => void;
  focusOnDates?: string[];
}

export const HolidayPlanner = ({
  holidays,
  companyHolidays = [],
  year,
  suggestions: externalSuggestions = [],
  selectedDates: externalSelectedDates = [],
  onDateChange,
  focusOnDates,
}: HolidayPlannerProps) => {
  const [internalSelectedDates, setInternalSelectedDates] = useState<string[]>([]);
  const selectedDates = externalSelectedDates.length > 0 ? externalSelectedDates : internalSelectedDates;
  const [suggestedDates, setSuggestedDates] = useState<string[]>([]);
  const [algorithmSuggestions, setAlgorithmSuggestions] = useState<PlanSuggestion[]>([]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  
  useEffect(() => {
    if (holidays.length > 0) {
      // Filter out past holidays before generating suggestions
      const today = startOfDay(new Date());
      const futureHolidays = holidays.filter(holiday => {
        const holidayDate = startOfDay(parseISO(holiday.date));
        return !isPast(holidayDate) || isSameDay(holidayDate, today);
      });
      
      const suggestions = findOptimalVacationPeriods(futureHolidays, year);
      setAlgorithmSuggestions(suggestions);
      
      const allSuggestions = externalSuggestions.length > 0 
        ? [...externalSuggestions, ...suggestions]
        : suggestions;
      
      const suggested: string[] = [];
      allSuggestions.slice(0, 3).forEach(suggestion => {
        suggested.push(suggestion.startDate, suggestion.endDate);
      });
      setSuggestedDates(suggested);
    }
  }, [holidays, year, externalSuggestions]);
  
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
    try {
      const start = parseDateString(suggestion.startDate);
      const end = parseDateString(suggestion.endDate);
      const dates: string[] = [];
      
      const allDays = eachDayOfInterval({ start, end });
      
      for (const day of allDays) {
        const dateStr = formatDate(day);
        const isPublicHoliday = holidays.some(h => h.date === dateStr);
        const isCompanyHoliday = companyHolidays.some(h => h.date === dateStr);
        const dayOfWeek = day.getDay();
        
        if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(dateStr);
        }
      }
      
      const sortedDates = [...new Set(dates)].sort();
      
      if (sortedDates.length === 0) {
        alert('No weekdays available to apply in this plan after filtering holidays and weekends.');
        return;
      }

      if (onDateChange) {
        onDateChange(sortedDates);
        setAppliedFeedback('Applied!');
        setTimeout(() => setAppliedFeedback(null), 1500);
        setTimeout(() => {
          calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        setInternalSelectedDates(sortedDates);
        setAppliedFeedback('Applied!');
        setTimeout(() => setAppliedFeedback(null), 1500);
        setTimeout(() => {
          calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      alert('Error applying suggestion: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const allSuggestions = externalSuggestions.length > 0
    ? [...externalSuggestions, ...algorithmSuggestions]
    : algorithmSuggestions;
  
  // Filter out past holidays
  const today = startOfDay(new Date());
  const futureHolidays = holidays.filter(holiday => {
    const holidayDate = startOfDay(parseISO(holiday.date));
    return !isPast(holidayDate) || isSameDay(holidayDate, today);
  });
  
  return (
    <div className="holiday-planner">
      <PlanSuggestions
        suggestions={allSuggestions}
        onApplySuggestion={handleApplySuggestion}
        appliedFeedback={appliedFeedback}
      />
      <div ref={calendarRef}>
        <Calendar
          selectedDates={selectedDates}
          suggestedDates={suggestedDates}
          holidays={futureHolidays}
          companyHolidays={companyHolidays}
          onDateClick={handleDateClick}
          year={year}
          focusOnDates={focusOnDates}
        />
      </div>
    </div>
  );
};
