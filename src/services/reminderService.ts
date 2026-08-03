import type { ReminderSettings, HolidayPlan } from '../utils/types';
import { getAllPlans } from './planStorage';

const SETTINGS_KEY = 'reminder-settings';
const LAST_CHECK_KEY = 'reminder-last-check';

export const getDefaultSettings = (): ReminderSettings => ({
  enabled: false,
  daysBeforeVacation: [7, 3, 1],
  ptoRequestDeadlineDays: 14,
  bookingWindowDays: 30,
});

export const getReminderSettings = (): ReminderSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(stored) };
  } catch (error) {
    return getDefaultSettings();
  }
};

export const saveReminderSettings = (settings: ReminderSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export interface UpcomingReminder {
  planId: string;
  planName: string;
  type: 'vacation' | 'pto-request' | 'booking';
  daysUntil: number;
  vacationStartDate: string;
  message: string;
}

export const getUpcomingReminders = (): UpcomingReminder[] => {
  const settings = getReminderSettings();
  if (!settings.enabled) return [];
  
  const plans = getAllPlans();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const reminders: UpcomingReminder[] = [];
  
  plans.forEach(plan => {
    if (!plan.vacationDays || plan.vacationDays.length === 0) return;
    
    // Get first vacation day as start date
    const sortedDays = [...plan.vacationDays].sort();
    const startDate = new Date(sortedDays[0]);
    startDate.setHours(0, 0, 0, 0);
    
    const daysUntilVacation = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only show future vacations
    if (daysUntilVacation < 0) return;
    
    // Vacation reminders
    settings.daysBeforeVacation.forEach(days => {
      if (daysUntilVacation === days) {
        reminders.push({
          planId: plan.id,
          planName: plan.name,
          type: 'vacation',
          daysUntil: days,
          vacationStartDate: sortedDays[0],
          message: days === 0 
            ? `Your vacation "${plan.name}" starts today!`
            : days === 1
            ? `Your vacation "${plan.name}" starts tomorrow!`
            : `Your vacation "${plan.name}" starts in ${days} days`,
        });
      }
    });
    
    // PTO request deadline reminder
    if (settings.ptoRequestDeadlineDays && daysUntilVacation === settings.ptoRequestDeadlineDays) {
      reminders.push({
        planId: plan.id,
        planName: plan.name,
        type: 'pto-request',
        daysUntil: settings.ptoRequestDeadlineDays,
        vacationStartDate: sortedDays[0],
        message: `Submit PTO request for "${plan.name}" (${settings.ptoRequestDeadlineDays} days before vacation)`,
      });
    }
    
    // Booking window reminder
    if (settings.bookingWindowDays && daysUntilVacation === settings.bookingWindowDays) {
      reminders.push({
        planId: plan.id,
        planName: plan.name,
        type: 'booking',
        daysUntil: settings.bookingWindowDays,
        vacationStartDate: sortedDays[0],
        message: `Book travel for "${plan.name}" (${settings.bookingWindowDays} days before vacation)`,
      });
    }
  });
  
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
};

export const showBrowserNotification = (reminder: UpcomingReminder): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('StretchBreak Reminder', {
        body: reminder.message,
        icon: '/favicon.ico',
        tag: `reminder-${reminder.planId}-${reminder.type}`,
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
};

export const checkRemindersOnLoad = (): void => {
  const settings = getReminderSettings();
  if (!settings.enabled) return;
  
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const today = new Date().toISOString().split('T')[0];
  
  // Only check once per day
  if (lastCheck === today) return;
  
  const reminders = getUpcomingReminders();
  const todayReminders = reminders.filter(r => r.daysUntil <= 7); // Next week
  
  // Show browser notifications for today's reminders
  if (Notification.permission === 'granted') {
    todayReminders.forEach(reminder => {
      if (reminder.daysUntil <= 1) {
        showBrowserNotification(reminder);
      }
    });
  }
  
  localStorage.setItem(LAST_CHECK_KEY, today);
};
