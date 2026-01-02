import { useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import type { CompanyHoliday } from '../../utils/types';
import './CompanyHolidays.css';

interface CompanyHolidaysProps {
  holidays: CompanyHoliday[];
  onAdd: (holiday: CompanyHoliday) => void;
  onDelete: (id: string) => void;
}

export const CompanyHolidays = ({ holidays, onAdd, onDelete }: CompanyHolidaysProps) => {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  
  const handleAdd = () => {
    if (!date || !name.trim()) {
      alert('Please enter both date and holiday name');
      return;
    }
    
    onAdd({
      id: `company-${Date.now()}`,
      date,
      name: name.trim(),
    });
    
    setDate('');
    setName('');
  };
  
  return (
    <div className="company-holidays">
      <label className="company-holidays-label">Company Holidays</label>
      <p className="company-holidays-description">
        Add company-specific non-working days to improve your vacation planning
      </p>
      
      <div className="add-holiday-form">
        <div className="form-group">
          <label htmlFor="holiday-date">Date</label>
          <input
            id="holiday-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="holiday-name">Holiday Name</label>
          <input
            id="holiday-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter holiday name"
            className="name-input"
          />
        </div>
        <button onClick={handleAdd} className="add-button">
          Add Holiday
        </button>
      </div>
      
      {holidays.length > 0 && (
        <div className="holidays-list">
          <h4>Added Company Holidays</h4>
          <div className="holidays-grid">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="holiday-item">
                <div className="holiday-info">
                  <span className="holiday-date">{formatDate(new Date(holiday.date))}</span>
                  <span className="holiday-name">{holiday.name}</span>
                </div>
                <button
                  onClick={() => onDelete(holiday.id)}
                  className="delete-holiday-button"
                  title="Remove holiday"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

