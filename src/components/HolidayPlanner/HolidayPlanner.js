import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Calendar } from '../Calendar/Calendar';
import { PlanSuggestions } from './PlanSuggestions';
import { findOptimalVacationPeriods } from '../../utils/planningAlgorithm';
import { formatDate } from '../../utils/dateUtils';
import './HolidayPlanner.css';
export const HolidayPlanner = ({ holidays, companyHolidays = [], year, suggestions: externalSuggestions = [], selectedDates: externalSelectedDates = [], onDateChange, }) => {
    const [internalSelectedDates, setInternalSelectedDates] = useState([]);
    const selectedDates = externalSelectedDates.length > 0 ? externalSelectedDates : internalSelectedDates;
    const [suggestedDates, setSuggestedDates] = useState([]);
    const [algorithmSuggestions, setAlgorithmSuggestions] = useState([]);
    useEffect(() => {
        if (holidays.length > 0) {
            const suggestions = findOptimalVacationPeriods(holidays, year);
            setAlgorithmSuggestions(suggestions);
            const allSuggestions = externalSuggestions.length > 0
                ? [...externalSuggestions, ...suggestions].slice(0, 5)
                : suggestions;
            const suggested = [];
            allSuggestions.slice(0, 3).forEach(suggestion => {
                suggested.push(suggestion.startDate, suggestion.endDate);
            });
            setSuggestedDates(suggested);
        }
    }, [holidays, year, externalSuggestions]);
    const handleDateClick = (date) => {
        const dateStr = formatDate(date);
        const newDates = selectedDates.includes(dateStr)
            ? selectedDates.filter(d => d !== dateStr)
            : [...selectedDates, dateStr].sort();
        if (onDateChange) {
            onDateChange(newDates);
        }
        else {
            setInternalSelectedDates(newDates);
        }
    };
    const handleApplySuggestion = (suggestion) => {
        const start = new Date(suggestion.startDate);
        const end = new Date(suggestion.endDate);
        const dates = [];
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
        }
        else {
            setInternalSelectedDates(dates);
        }
    };
    const allSuggestions = externalSuggestions.length > 0
        ? [...externalSuggestions, ...algorithmSuggestions].slice(0, 5)
        : algorithmSuggestions;
    return (_jsxs("div", { className: "holiday-planner", children: [_jsx(PlanSuggestions, { suggestions: allSuggestions, onApplySuggestion: handleApplySuggestion }), _jsx(Calendar, { selectedDates: selectedDates, suggestedDates: suggestedDates, holidays: holidays, onDateClick: handleDateClick, year: year })] }));
};
