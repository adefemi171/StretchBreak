import { getAllOverlappingDates } from '../../utils/planOverlap';
import type { HolidayPlan } from '../../utils/types';
import { PlanCard } from './PlanCard';
import { PlanForm } from './PlanForm';
import { ShareModal } from './ShareModal';
import { PlanComparison } from './PlanComparison';
import { useState, useMemo } from 'react';
import './PlanList.css';

interface PlanListProps {
  plans: HolidayPlan[];
  onUpdatePlan: (plan: HolidayPlan) => void;
  onDeletePlan: (id: string) => void;
  onSelectPlan: (plan: HolidayPlan) => void;
  currentVacationDays: string[];
  currentHolidays: any[];
  currentCountryCode: string;
  currentYear: number;
}

export const PlanList = ({
  plans,
  onUpdatePlan,
  onDeletePlan,
  onSelectPlan,
  currentVacationDays,
  currentHolidays,
  currentCountryCode,
  currentYear,
}: PlanListProps) => {
  const [editingPlan, setEditingPlan] = useState<HolidayPlan | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [sharingPlan, setSharingPlan] = useState<HolidayPlan | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());

  const handleSave = (plan: HolidayPlan) => {
    onUpdatePlan(plan);
    setShowForm(false);
    setEditingPlan(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      onDeletePlan(id);
    }
  };

  const handleEdit = (plan: HolidayPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForComparison(new Set());
  };

  const togglePlanSelection = (planId: string) => {
    setSelectedForComparison(prev => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const getSelectedPlans = (): HolidayPlan[] => {
    return plans.filter(plan => selectedForComparison.has(plan.id));
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
        {plans.length >= 2 && (
          <button
            onClick={toggleCompareMode}
            className={`compare-mode-button ${compareMode ? 'active' : ''}`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Plans'}
          </button>
        )}
      </div>

      {plans.length > 0 && overlapStats && overlapStats.totalOverlappingDates > 0 && (
        <div className="overlap-summary">
          <div className="overlap-summary-header">
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

      {compareMode && selectedForComparison.size >= 2 && (
        <PlanComparison
          selectedPlans={getSelectedPlans()}
          onClose={() => {
            setCompareMode(false);
            setSelectedForComparison(new Set());
          }}
        />
      )}

      {compareMode && selectedForComparison.size < 2 && (
        <div className="compare-instruction">
          <p>Select at least 2 plans to see a comparison</p>
          <p className="compare-hint">Click on plan cards to select them</p>
        </div>
      )}

      {plans.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>No saved plans yet. Go to the Planner tab to create your first plan!</p>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`plan-card-wrapper ${
                compareMode ? 'compare-mode' : ''
              } ${selectedForComparison.has(plan.id) ? 'selected' : ''}`}
              onClick={compareMode ? () => togglePlanSelection(plan.id) : undefined}
            >
              {compareMode && (
                <div className="selection-indicator">
                  <input
                    type="checkbox"
                    checked={selectedForComparison.has(plan.id)}
                    onChange={() => togglePlanSelection(plan.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <PlanCard
                plan={plan}
                allPlans={plans}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={onSelectPlan}
                onShare={setSharingPlan}
              />
            </div>
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
