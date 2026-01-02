import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './CalendarDay.css';
export const CalendarDay = ({ date, isCurrentMonth, isSelected, isSuggested, isPublicHoliday, isCompanyHoliday, isWeekend, holiday, companyHoliday, onClick, }) => {
    if (!date) {
        return _jsx("div", { className: "calendar-day empty" });
    }
    const handleClick = () => {
        if (isCurrentMonth && !isPublicHoliday && !isCompanyHoliday && !isWeekend) {
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
    return (_jsxs("div", { className: classes, onClick: handleClick, children: [_jsx("div", { className: "day-number", children: dayNumber }), holiday && (_jsx("div", { className: "holiday-name", title: `${holiday.localName} (${holiday.name})`, children: holiday.localName.length > 12
                    ? holiday.localName.substring(0, 10) + '...'
                    : holiday.localName })), companyHoliday && !holiday && (_jsx("div", { className: "company-holiday-name", title: companyHoliday.name, children: companyHoliday.name.length > 12
                    ? companyHoliday.name.substring(0, 10) + '...'
                    : companyHoliday.name })), isSelected && (_jsx("div", { className: "selected-indicator", children: "\u2713" }))] }));
};
