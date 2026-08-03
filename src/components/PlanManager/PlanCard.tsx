import { formatDateDisplay } from '../../utils/dateUtils';
import { detectPlanOverlaps } from '../../utils/planOverlap';
import { analyzeConflicts } from '../../utils/conflictDetection';
import type { HolidayPlan } from '../../utils/types';
import './PlanCard.css';

interface PlanCardProps {
  plan: HolidayPlan;
  allPlans: HolidayPlan[];
  onEdit: (plan: HolidayPlan) => void;
  onDelete: (id: string) => void;
  onSelect: (plan: HolidayPlan) => void;
  onShare: (plan: HolidayPlan) => void;
}

export const PlanCard = ({
  plan,
  allPlans,
  onEdit,
  onDelete,
  onSelect,
  onShare,
}: PlanCardProps) => {
  const overlapInfo = detectPlanOverlaps(plan, allPlans);
  const hasOverlaps = overlapInfo.overlapCount > 0;
  
  // Get used dates from all plans (excluding current plan)
  const usedDates = new Set<string>();
  allPlans.forEach(p => {
    if (p.id !== plan.id) {
      p.vacationDays.forEach(day => {
        if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
          usedDates.add(day.trim());
        }
      });
    }
  });
  
  // Only flag days that are both selected PTO and a holiday (usually company holidays added later)
  const conflictAnalysis = analyzeConflicts(
    plan.vacationDays,
    plan.publicHolidays || [],
    plan.companyHolidays || [],
    usedDates
  );
  
  const hasConflicts = conflictAnalysis.hasConflicts;
  const companyConflictCount = conflictAnalysis.holidayConflicts.filter(c => c.type === 'company').length;
  
  return (
    <div className={`plan-card ${hasOverlaps || hasConflicts ? 'has-warnings' : ''}`}>
      <div className="plan-card-header">
        <div className="plan-title-section">
          <h4>{plan.name}</h4>
          {(hasOverlaps || hasConflicts) && (
            <span className="overlap-badge" title={
              hasConflicts 
                ? `${conflictAnalysis.holidayConflicts.length} selected day(s) coincide with holidays`
                : `${overlapInfo.overlapCount} overlapping date(s) with other plans`
            }>
              {hasConflicts
                ? `${conflictAnalysis.holidayConflicts.length} holiday overlap${conflictAnalysis.holidayConflicts.length !== 1 ? 's' : ''}`
                : `${overlapInfo.overlapCount} overlap${overlapInfo.overlapCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        <div className="plan-actions">
          <button onClick={() => onSelect(plan)} className="action-button select">
            View
          </button>
          <button onClick={() => onEdit(plan)} className="action-button edit">
            Edit
          </button>
          <button onClick={() => onShare(plan)} className="action-button share">
            Share
          </button>
          <button onClick={() => onDelete(plan.id)} className="action-button delete">
            Delete
          </button>
        </div>
      </div>
      {plan.description && (
        <p className="plan-description">{plan.description}</p>
      )}
      <div className="plan-details">
        <div className="detail">
          <span className="detail-label">Country:</span>
          <span className="detail-value">{plan.countryCode}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Year:</span>
          <span className="detail-value">{plan.year}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Vacation Days:</span>
          <span className="detail-value">{plan.vacationDays.length}</span>
        </div>
      </div>
      {hasConflicts && (
        <div className="holiday-conflict-warning">
          <div className="conflict-warning-header">
            <span className="conflict-text">
              {conflictAnalysis.holidayConflicts.length} selected day{conflictAnalysis.holidayConflicts.length !== 1 ? 's' : ''} coincide{conflictAnalysis.holidayConflicts.length === 1 ? 's' : ''} with {companyConflictCount > 0 ? 'company ' : ''}holiday{conflictAnalysis.holidayConflicts.length !== 1 ? 's' : ''}
            </span>
          </div>
          {conflictAnalysis.alternativeDates.length > 0 && (
            <div className="conflict-alternatives">
              <span className="alternatives-hint">Nearby options:</span>
              {conflictAnalysis.alternativeDates.slice(0, 2).map(altDate => (
                <span key={altDate} className="alternative-date-compact">
                  {formatDateDisplay(altDate)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {hasOverlaps && (
        <div className="overlap-warning">
          <div className="overlap-warning-header">
            <span className="overlap-text">
              This plan shares {overlapInfo.overlapCount} date{overlapInfo.overlapCount !== 1 ? 's' : ''} with:
            </span>
          </div>
          <div className="overlapping-plans-list">
            {overlapInfo.overlappingPlans.map(overlapPlan => (
              <span key={overlapPlan.planId} className="overlap-plan-name">
                {overlapPlan.planName}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="plan-footer">
        <span className="plan-date">
          Created: {formatDateDisplay(plan.createdAt)}
        </span>
      </div>
    </div>
  );
};

