import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getCalendarDays, formatDate, isWeekendDay, isSameDate } from '../../utils/dateUtils';
import { CalendarDay } from './CalendarDay';
import './CalendarMonth.css';
export const CalendarMonth = ({ date, selectedDates, suggestedDates, holidays, companyHolidays = [], onDateClick, }) => {
    const calendarDays = getCalendarDays(date);
    const currentMonth = date.getMonth();
    const isDateSelected = (dayDate) => {
        return selectedDates.some(selected => isSameDate(selected, dayDate));
    };
    const isDateSuggested = (dayDate) => {
        return suggestedDates.some(suggested => isSameDate(suggested, dayDate));
    };
    const getHolidayForDate = (dayDate) => {
        return holidays.find(h => isSameDate(h.date, dayDate));
    };
    const getCompanyHolidayForDate = (dayDate) => {
        return companyHolidays.find(h => isSameDate(h.date, dayDate));
    };
    const isCompanyHoliday = (dayDate) => {
        return companyHolidays.some(h => isSameDate(h.date, dayDate));
    };
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (_jsxs("div", { className: "calendar-month", children: [_jsx("div", { className: "calendar-header", children: _jsx("h3", { children: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }) }), _jsxs("div", { className: "calendar-grid", children: [_jsx("div", { className: "calendar-weekdays", children: weekDays.map(day => (_jsx("div", { className: "weekday", children: day }, day))) }), _jsx("div", { className: "calendar-days", children: calendarDays.map((day, index) => {
                            if (!day) {
                                return _jsx(CalendarDay, { date: null, isCurrentMonth: false, isSelected: false, isSuggested: false, isPublicHoliday: false, isCompanyHoliday: false, isWeekend: false, onClick: () => { } }, `empty-${index}`);
                            }
                            const isCurrentMonth = day.getMonth() === currentMonth;
                            const isSelected = isDateSelected(day);
                            const isSuggested = isDateSuggested(day);
                            const holiday = getHolidayForDate(day);
                            const companyHoliday = getCompanyHolidayForDate(day);
                            const isPublicHoliday = !!holiday;
                            const isCompanyHolidayDay = isCompanyHoliday(day);
                            const isWeekend = isWeekendDay(day);
                            return (_jsx(CalendarDay, { date: day, isCurrentMonth: isCurrentMonth, isSelected: isSelected, isSuggested: isSuggested, isPublicHoliday: isPublicHoliday, isCompanyHoliday: isCompanyHolidayDay, isWeekend: isWeekend, holiday: holiday, companyHoliday: companyHoliday, onClick: onDateClick }, formatDate(day)));
                        }) })] })] }));
};
