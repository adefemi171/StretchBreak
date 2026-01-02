import { formatDateDisplay } from '../../utils/dateUtils';
import type { HolidayPlan } from '../../utils/types';
import './PlanCard.css';

interface PlanCardProps {
  plan: HolidayPlan;
  onEdit: (plan: HolidayPlan) => void;
  onDelete: (id: string) => void;
  onSelect: (plan: HolidayPlan) => void;
  onShare: (plan: HolidayPlan) => void;
}

export const PlanCard = ({
  plan,
  onEdit,
  onDelete,
  onSelect,
  onShare,
}: PlanCardProps) => {
  return (
    <div className="plan-card">
      <div className="plan-card-header">
        <h4>{plan.name}</h4>
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
      <div className="plan-footer">
        <span className="plan-date">
          Created: {formatDateDisplay(plan.createdAt)}
        </span>
      </div>
    </div>
  );
};

