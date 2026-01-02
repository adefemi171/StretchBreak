import { getAllPlans, deletePlan } from '../../services/planStorage';
import type { HolidayPlan } from '../../utils/types';
import { PlanCard } from './PlanCard';
import { PlanForm } from './PlanForm';
import { ShareModal } from './ShareModal';
import { useState, useEffect } from 'react';
import './PlanList.css';

interface PlanListProps {
  onSelectPlan: (plan: HolidayPlan) => void;
  currentVacationDays: string[];
  currentHolidays: any[];
  currentCountryCode: string;
  currentYear: number;
}

export const PlanList = ({
  onSelectPlan,
  currentVacationDays,
  currentHolidays,
  currentCountryCode,
  currentYear,
}: PlanListProps) => {
  const [plans, setPlans] = useState<HolidayPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<HolidayPlan | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [sharingPlan, setSharingPlan] = useState<HolidayPlan | null>(null);
  
  useEffect(() => {
    loadPlans();
  }, []);
  
  const loadPlans = () => {
    const allPlans = getAllPlans();
    setPlans(allPlans);
  };
  
  const handleSave = (plan: HolidayPlan) => {
    const { savePlan } = require('../../services/planStorage');
    savePlan(plan);
    loadPlans();
    setShowForm(false);
    setEditingPlan(undefined);
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlan(id);
      loadPlans();
    }
  };
  
  const handleEdit = (plan: HolidayPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };
  
  const handleNewPlan = () => {
    setEditingPlan(undefined);
    setShowForm(true);
  };
  
  return (
    <div className="plan-list">
      <div className="plan-list-header">
        <h2>Saved Plans</h2>
        <button onClick={handleNewPlan} className="new-plan-button">
          + New Plan
        </button>
      </div>
      
      {showForm && (
        <PlanForm
          plan={editingPlan}
          vacationDays={currentVacationDays}
          holidays={currentHolidays}
          countryCode={currentCountryCode}
          year={currentYear}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingPlan(undefined);
          }}
        />
      )}
      
      {plans.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>No saved plans yet. Create your first plan!</p>
          <button onClick={handleNewPlan} className="new-plan-button">
            Create Plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSelect={onSelectPlan}
              onShare={setSharingPlan}
            />
          ))}
        </div>
      )}
      
      {sharingPlan && (
        <ShareModal
          plan={sharingPlan}
          onClose={() => setSharingPlan(null)}
        />
      )}
    </div>
  );
};

