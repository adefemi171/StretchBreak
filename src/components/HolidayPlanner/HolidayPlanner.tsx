import { useState, useEffect } from 'react';
import { Calendar } from '../Calendar/Calendar';
import { PlanSuggestions } from './PlanSuggestions';
import { findOptimalVacationPeriods } from '../../utils/planningAlgorithm';
import { formatDate } from '../../utils/dateUtils';
import type { PublicHoliday, PlanSuggestion, CompanyHoliday } from '../../utils/types';
import './HolidayPlanner.css';

interface HolidayPlannerProps {
  holidays: PublicHoliday[];
  companyHolidays?: CompanyHoliday[];
  year: number;
  suggestions?: PlanSuggestion[];
  selectedDates?: string[];
  onDateChange?: (dates: string[]) => void;
}

export const HolidayPlanner = ({
  holidays,
  companyHolidays = [],
  year,
  suggestions: externalSuggestions = [],
  selectedDates: externalSelectedDates = [],
  onDateChange,
}: HolidayPlannerProps) => {
  const [internalSelectedDates, setInternalSelectedDates] = useState<string[]>([]);
  const selectedDates = externalSelectedDates.length > 0 ? externalSelectedDates : internalSelectedDates;
  const [suggestedDates, setSuggestedDates] = useState<string[]>([]);
  const [algorithmSuggestions, setAlgorithmSuggestions] = useState<PlanSuggestion[]>([]);
  
  useEffect(() => {
    if (holidays.length > 0) {
      const suggestions = findOptimalVacationPeriods(holidays, year);
      setAlgorithmSuggestions(suggestions);
      
      const allSuggestions = externalSuggestions.length > 0 
        ? [...externalSuggestions, ...suggestions].slice(0, 5)
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
    const start = new Date(suggestion.startDate);
    const end = new Date(suggestion.endDate);
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      const isPublicHoliday = holidays.some(h => h.date === dateStr);
      const isCompanyHoliday = companyHolidays.some(h => h.date === dateStr);
      const dayOfWeek = d.getDay();
      if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(dateStr);
      }
    }
    
    if (onDateChange) {
      onDateChange(dates);
    } else {
      setInternalSelectedDates(dates);
    }
  };
  
  const allSuggestions = externalSuggestions.length > 0
    ? [...externalSuggestions, ...algorithmSuggestions].slice(0, 5)
    : algorithmSuggestions;
  
  return (
    <div className="holiday-planner">
      <PlanSuggestions
        suggestions={allSuggestions}
        onApplySuggestion={handleApplySuggestion}
      />
      <Calendar
        selectedDates={selectedDates}
        suggestedDates={suggestedDates}
        holidays={holidays}
        onDateClick={handleDateClick}
        year={year}
      />
    </div>
  );
};
