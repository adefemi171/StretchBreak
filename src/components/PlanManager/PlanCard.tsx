import { formatDateDisplay } from '../../utils/dateUtils';
import { detectPlanOverlaps, type OverlapInfo } from '../../utils/planOverlap';
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
  
  return (
    <div className={`plan-card ${hasOverlaps ? 'has-overlaps' : ''}`}>
      <div className="plan-card-header">
        <div className="plan-title-section">
          <h4>{plan.name}</h4>
          {hasOverlaps && (
            <span className="overlap-badge" title={`${overlapInfo.overlapCount} overlapping date(s) with other plans`}>
              ⚠️ {overlapInfo.overlapCount} overlap{overlapInfo.overlapCount !== 1 ? 's' : ''}
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
      {hasOverlaps && (
        <div className="overlap-warning">
          <div className="overlap-warning-header">
            <span className="overlap-icon">⚠️</span>
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

