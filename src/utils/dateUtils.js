import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, getDay, parseISO } from 'date-fns';
export const formatDate = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'yyyy-MM-dd');
};
export const formatDateDisplay = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM d, yyyy');
};
export const isWeekendDay = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isWeekend(dateObj);
};
export const isSameDate = (date1, date2) => {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return isSameDay(d1, d2);
};
export const parseDateString = (dateString) => {
    return parseISO(dateString);
};
export const getCalendarDays = (date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDay = getDay(monthStart);
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }
    // Add all days in the month
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    days.push(...monthDays);
    // Fill remaining cells to make 7-day rows (6 rows max = 42 cells)
    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) {
        days.push(null);
    }
    return days;
};
