import { useState, useEffect } from 'react';
import type { ReminderSettings } from '../../utils/types';
import { 
  getReminderSettings, 
  saveReminderSettings, 
  requestNotificationPermission,
  getUpcomingReminders,
  type UpcomingReminder 
} from '../../services/reminderService';
import './RemindersPanel.css';

export const RemindersPanel = () => {
  const [settings, setSettings] = useState<ReminderSettings>(getReminderSettings());
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    loadReminders();
  }, [settings.enabled]);

  const loadReminders = () => {
    const upcoming = getUpcomingReminders();
    setReminders(upcoming);
  };

  const handleToggleEnabled = () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    saveReminderSettings(newSettings);
  };

  const handleDaysChange = (days: number) => {
    const current = settings.daysBeforeVacation;
    const newDays = current.includes(days)
      ? current.filter(d => d !== days)
      : [...current, days].sort((a, b) => b - a);
    
    const newSettings = { ...settings, daysBeforeVacation: newDays };
    setSettings(newSettings);
    saveReminderSettings(newSettings);
  };

  const handlePTODeadlineChange = (value: string) => {
    const days = value ? Number(value) : undefined;
    const newSettings = { ...settings, ptoRequestDeadlineDays: days };
    setSettings(newSettings);
    saveReminderSettings(newSettings);
  };

  const handleBookingWindowChange = (value: string) => {
    const days = value ? Number(value) : undefined;
    const newSettings = { ...settings, bookingWindowDays: days };
    setSettings(newSettings);
    saveReminderSettings(newSettings);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
    } else {
      setNotificationPermission('denied');
    }
  };

  const reminderTypeLabels: Record<UpcomingReminder['type'], string> = {
    vacation: 'Vacation',
    'pto-request': 'PTO request',
    booking: 'Booking',
  };

  return (
    <div className="reminders-panel">
      <div className="reminders-header">
        <h3>Vacation Reminders</h3>
        <p className="reminders-honesty">
          Local-only · browser Notification when you open the app. No email or push delivery.
        </p>
        <label className="reminders-toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={handleToggleEnabled}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Enable reminders</span>
        </label>
      </div>

      {settings.enabled && (
        <>
          <div className="reminders-section">
            <h4>Days before vacation</h4>
            <p className="section-description">Show a browser notification when you next load the app</p>
            <div className="days-chips">
              {[1, 3, 7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => handleDaysChange(days)}
                  className={`day-chip ${settings.daysBeforeVacation.includes(days) ? 'active' : ''}`}
                >
                  {days} {days === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </div>

          <div className="reminders-section">
            <h4>PTO request deadline</h4>
            <p className="section-description">Remind me to submit PTO request</p>
            <div className="deadline-input">
              <input
                type="number"
                min="1"
                max="90"
                value={settings.ptoRequestDeadlineDays || ''}
                onChange={(e) => handlePTODeadlineChange(e.target.value)}
                placeholder="14"
              />
              <span>days before vacation</span>
            </div>
          </div>

          <div className="reminders-section">
            <h4>Booking window</h4>
            <p className="section-description">Remind me to book travel and accommodations</p>
            <div className="deadline-input">
              <input
                type="number"
                min="1"
                max="180"
                value={settings.bookingWindowDays || ''}
                onChange={(e) => handleBookingWindowChange(e.target.value)}
                placeholder="30"
              />
              <span>days before vacation</span>
            </div>
          </div>

          <div className="reminders-section">
            <h4>Browser notifications</h4>
            <p className="section-description">Desktop Notification API only — checked when this page loads</p>
            {notificationPermission === 'default' && (
              <button onClick={handleRequestPermission} className="notification-button">
                Enable browser notifications
              </button>
            )}
            {notificationPermission === 'granted' && (
              <div className="notification-status granted">
                ✓ Browser notifications enabled
              </div>
            )}
            {notificationPermission === 'denied' && (
              <div className="notification-status denied">
                Browser notifications blocked. Enable them in your browser settings.
              </div>
            )}
          </div>

          {reminders.length > 0 && (
            <div className="reminders-section">
              <h4>Upcoming reminders</h4>
              <div className="reminders-list">
                {reminders.map((reminder, index) => (
                  <div key={`${reminder.planId}-${reminder.type}-${index}`} className="reminder-item">
                    <div className="reminder-icon">
                      {reminderTypeLabels[reminder.type]}
                    </div>
                    <div className="reminder-content">
                      <div className="reminder-message">{reminder.message}</div>
                      <div className="reminder-date">
                        {reminder.vacationStartDate}
                        {reminder.daysUntil > 0 && (
                          <span className="reminder-countdown">
                            {' '}• in {reminder.daysUntil} {reminder.daysUntil === 1 ? 'day' : 'days'}
                          </span>
                        )}
                        {reminder.daysUntil === 0 && (
                          <span className="reminder-countdown today"> • Today!</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reminders.length === 0 && (
            <div className="no-reminders">
              <p>No upcoming reminders</p>
              <p className="no-reminders-hint">Reminders will appear here when you have saved vacation plans</p>
            </div>
          )}
        </>
      )}

      {!settings.enabled && (
        <div className="reminders-disabled">
          <p>Enable reminders to see upcoming items here and get a browser notification when you open the app</p>
        </div>
      )}
    </div>
  );
};
