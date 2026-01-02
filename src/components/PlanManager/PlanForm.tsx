import { useState, useEffect } from 'react';
import type { HolidayPlan } from '../../utils/types';
import './PlanForm.css';

interface PlanFormProps {
  plan?: HolidayPlan;
  vacationDays: string[];
  holidays: any[];
  countryCode: string;
  year: number;
  onSave: (plan: HolidayPlan) => void;
  onCancel: () => void;
}

export const PlanForm = ({
  plan,
  vacationDays,
  holidays,
  countryCode,
  year,
  onSave,
  onCancel,
}: PlanFormProps) => {
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  
  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
    }
  }, [plan]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a plan name');
      return;
    }
    
    const planToSave: HolidayPlan = {
      id: plan?.id || `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      countryCode,
      year,
      vacationDays,
      publicHolidays: holidays,
      createdAt: plan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    onSave(planToSave);
  };
  
  return (
    <form className="plan-form" onSubmit={handleSubmit}>
      <h3>{plan ? 'Edit Plan' : 'Save Plan'}</h3>
      <div className="form-group">
        <label htmlFor="plan-name">Plan Name *</label>
        <input
          id="plan-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer 2024 Vacation"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="plan-description">Description</label>
        <textarea
          id="plan-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
        />
      </div>
      <div className="form-info">
        <p>Vacation Days: {vacationDays.length}</p>
        <p>Public Holidays: {holidays.length}</p>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button type="submit" className="save-button">
          {plan ? 'Update' : 'Save'} Plan
        </button>
      </div>
    </form>
  );
};

