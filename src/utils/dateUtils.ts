import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, parseISO } from 'date-fns';

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

export const formatDateDisplay = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
};

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

export const normalizeWorkDays = (workDays?: number[]): number[] => {
  const days = [...new Set((workDays ?? DEFAULT_WORK_DAYS).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))];
  // At least one workday prevents unbounded adjacent-break expansion.
  return days.length > 0 ? days : DEFAULT_WORK_DAYS;
};

export const isWeekendDay = (date: Date | string, workDays?: number[]): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return !normalizeWorkDays(workDays).includes(getDay(dateObj));
};

export const isSameDate = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isSameDay(d1, d2);
};

export const parseDateString = (dateString: string): Date => {
  return parseISO(dateString);
};

export const getCalendarDays = (date: Date): (Date | null)[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDay = getDay(monthStart);
  
  const days: (Date | null)[] = [];
  
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

