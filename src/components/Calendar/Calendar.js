import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { addMonths, subMonths } from 'date-fns';
import { CalendarMonth } from './CalendarMonth';
import './Calendar.css';
export const Calendar = ({ selectedDates, suggestedDates, holidays, companyHolidays = [], onDateClick, year, }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(year, 0, 1));
    const [viewMode, setViewMode] = useState('single');
    const handlePreviousMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };
    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };
    const handleToday = () => {
        setCurrentMonth(new Date());
    };
    const handleMonthChange = (e) => {
        const monthIndex = parseInt(e.target.value);
        setCurrentMonth(new Date(year, monthIndex, 1));
    };
    // Show 1 or 3 months based on view mode
    const months = viewMode === 'single'
        ? [currentMonth]
        : [
            currentMonth,
            addMonths(currentMonth, 1),
            addMonths(currentMonth, 2),
        ];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return (_jsxs("div", { className: "calendar-container", children: [_jsxs("div", { className: "calendar-controls", children: [_jsxs("div", { className: "calendar-nav-group", children: [_jsx("button", { onClick: handlePreviousMonth, className: "nav-button", title: "Previous month", children: "\u2190" }), _jsx("select", { value: currentMonth.getMonth(), onChange: handleMonthChange, className: "month-select", children: monthNames.map((name, index) => (_jsxs("option", { value: index, children: [name, " ", currentMonth.getFullYear()] }, index))) }), _jsx("button", { onClick: handleNextMonth, className: "nav-button", title: "Next month", children: "\u2192" }), _jsx("button", { onClick: handleToday, className: "nav-button today-button", title: "Go to today", children: "Today" })] }), _jsxs("div", { className: "view-toggle", children: [_jsx("button", { onClick: () => setViewMode('single'), className: `view-button ${viewMode === 'single' ? 'active' : ''}`, title: "Single month view", children: "1 Month" }), _jsx("button", { onClick: () => setViewMode('triple'), className: `view-button ${viewMode === 'triple' ? 'active' : ''}`, title: "Three months view", children: "3 Months" })] })] }), _jsx("div", { className: "calendar-months", children: months.map((month) => (_jsx(CalendarMonth, { date: month, selectedDates: selectedDates, suggestedDates: suggestedDates, holidays: holidays, companyHolidays: companyHolidays, onDateClick: onDateClick }, `${month.getFullYear()}-${month.getMonth()}`))) }), _jsxs("div", { className: "calendar-legend", children: [_jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "legend-color holiday" }), _jsx("span", { children: "Public Holiday" })] }), _jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "legend-color suggested" }), _jsx("span", { children: "Suggested" })] }), _jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "legend-color selected" }), _jsx("span", { children: "Selected" })] }), _jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "legend-color company-holiday" }), _jsx("span", { children: "Company Holiday" })] }), _jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "legend-color weekend" }), _jsx("span", { children: "Weekend" })] })] })] }));
};
