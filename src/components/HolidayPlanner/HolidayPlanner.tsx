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
    console.log('handleApplySuggestion called with:', suggestion);
    try {
      const start = parseDateString(suggestion.startDate);
      const end = parseDateString(suggestion.endDate);
      const dates: string[] = [];
      
      console.log('Processing dates from', start, 'to', end);
      
      // Use date-fns to get all days in the interval
      const allDays = eachDayOfInterval({ start, end });
      
      for (const day of allDays) {
        const dateStr = formatDate(day);
        const isPublicHoliday = holidays.some(h => h.date === dateStr);
        const isCompanyHoliday = companyHolidays.some(h => h.date === dateStr);
        const dayOfWeek = day.getDay();
        
        // Include weekdays that are not holidays
        if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(dateStr);
        }
      }
      
      // Sort dates and remove duplicates (shouldn't be any, but just in case)
      const sortedDates = [...new Set(dates)].sort();
      
      console.log('Calculated dates to apply:', sortedDates);
      
      if (sortedDates.length === 0) {
        console.warn('No dates to apply - all dates in range are weekends or holidays');
        alert('This suggestion contains no vacation days to apply (all dates are weekends or holidays).');
        return;
      }
      
      // Apply the dates
      if (onDateChange) {
        console.log('Calling onDateChange with', sortedDates.length, 'dates');
        onDateChange(sortedDates);
        
        // Show a brief visual feedback
        const button = document.activeElement as HTMLElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Applied!';
          button.style.backgroundColor = '#218838';
          setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
          }, 1000);
        }
        
        setTimeout(() => {
          calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        console.log('Setting internal selected dates:', sortedDates.length, 'dates');
        setInternalSelectedDates(sortedDates);
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
      />
      <div ref={calendarRef}>
        <Calendar
          selectedDates={selectedDates}
          suggestedDates={suggestedDates}
          holidays={futureHolidays}
          onDateClick={handleDateClick}
          year={year}
          focusOnDates={focusOnDates || selectedDates}
        />
      </div>
    </div>
  );
};
