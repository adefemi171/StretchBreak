import { getAllPlans, deletePlan } from '../../services/planStorage';
import { getAllOverlappingDates } from '../../utils/planOverlap';
import type { HolidayPlan } from '../../utils/types';
import { PlanCard } from './PlanCard';
import { PlanForm } from './PlanForm';
import { ShareModal } from './ShareModal';
import { useState, useEffect, useMemo } from 'react';
import './PlanList.css';

interface PlanListProps {
  onSelectPlan: (plan: HolidayPlan) => void;
  currentVacationDays: string[];
  currentHolidays: any[];
  currentCountryCode: string;
  currentYear: number;
  onPlanDeleted?: () => void;
}

export const PlanList = ({
  onSelectPlan,
  currentVacationDays,
  currentHolidays,
  currentCountryCode,
  currentYear,
  onPlanDeleted,
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
      // Notify parent to recalculate remaining PTO
      if (onPlanDeleted) {
        onPlanDeleted();
      }
    }
  };
  
  const handleEdit = (plan: HolidayPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };
  
  const overlapStats = useMemo(() => {
    if (plans.length === 0) return null;
    
    const overlappingDates = getAllOverlappingDates(plans);
    const totalOverlappingDates = overlappingDates.size;
    const totalUniqueDays = new Set<string>();
    plans.forEach(plan => {
      plan.vacationDays.forEach(day => {
        if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
          totalUniqueDays.add(day.trim());
        }
      });
    });
    
    return {
      totalOverlappingDates,
      totalUniqueDays: totalUniqueDays.size,
      totalDaysAcrossPlans: plans.reduce((sum, plan) => sum + plan.vacationDays.length, 0),
    };
  }, [plans]);
  
  return (
    <div className="plan-list">
      <div className="plan-list-header">
        <h2>Saved Plans</h2>
      </div>
      
      {plans.length > 0 && overlapStats && overlapStats.totalOverlappingDates > 0 && (
        <div className="overlap-summary">
          <div className="overlap-summary-header">
            <span className="overlap-summary-icon">⚠️</span>
            <span className="overlap-summary-title">Overlap Detected</span>
          </div>
          <div className="overlap-summary-content">
            <p>
              <strong>{overlapStats.totalOverlappingDates}</strong> date{overlapStats.totalOverlappingDates !== 1 ? 's' : ''} appear in multiple plans.
              Only <strong>{overlapStats.totalUniqueDays}</strong> unique day{overlapStats.totalUniqueDays !== 1 ? 's' : ''} count toward your PTO.
            </p>
            <p className="overlap-summary-note">
              Total days across all plans: {overlapStats.totalDaysAcrossPlans} | Unique days: {overlapStats.totalUniqueDays}
            </p>
          </div>
        </div>
      )}
      
      {showForm && editingPlan && (
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
          <p>No saved plans yet. Go to the Planner tab to create your first plan!</p>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              allPlans={plans}
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

