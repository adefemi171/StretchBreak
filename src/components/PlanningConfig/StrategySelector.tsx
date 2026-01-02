import type { VacationStrategy } from '../../utils/types';
import './StrategySelector.css';

interface StrategySelectorProps {
  value?: VacationStrategy;
  onChange: (strategy: VacationStrategy) => void;
  disabledStrategies?: string[];
  onApplyStrategy?: (strategy: VacationStrategy) => void;
}

const strategies: Array<{
  value: VacationStrategy;
  label: string;
  description: string;
}> = [
  {
    value: 'balanced',
    label: 'Flexible Approach',
    description: 'A mix of short getaways and longer vacations throughout the year',
  },
  {
    value: 'long-weekends',
    label: 'Weekend Focus',
    description: 'Prioritize extending weekends into 3-4 day mini vacations',
  },
  {
    value: 'mini-breaks',
    label: 'Short Getaways',
    description: 'Multiple brief 5-6 day escapes distributed across the year',
  },
  {
    value: 'week-long',
    label: 'Full Week Vacations',
    description: 'Plan substantial 7-9 day blocks for meaningful time away',
  },
  {
    value: 'extended',
    label: 'Deep Breaks',
    description: 'Longer 10-15 day periods for extended rest and travel',
  },
];

export const StrategySelector = ({ value, onChange, disabledStrategies = [], onApplyStrategy }: StrategySelectorProps) => {
  const handleApplyClick = (e: React.MouseEvent, strategy: VacationStrategy) => {
    e.stopPropagation();
    if (onApplyStrategy) {
      onApplyStrategy(strategy);
    }
  };

  return (
    <div className="strategy-selector">
      <label className="strategy-label">Choose Your Strategy (Optional)</label>
      <p className="strategy-subtitle">Select how you'd like to distribute your time off</p>
      <div className="strategy-options">
        {strategies.map((strategy) => {
          const isDisabled = disabledStrategies.includes(strategy.value);
          return (
            <div
              key={strategy.value}
              className={`strategy-option ${value === strategy.value ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onChange(strategy.value)}
            >
              <div className="strategy-radio">
                <input
                  type="radio"
                  name="strategy"
                  value={strategy.value}
                  checked={value === strategy.value}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && onChange(strategy.value)}
                />
              </div>
              <div className="strategy-content">
                <div className="strategy-name">
                  {strategy.label}
                  {isDisabled && <span className="strategy-used-badge"> (Already Used)</span>}
                </div>
                <div className="strategy-description">{strategy.description}</div>
              </div>
              {!isDisabled && onApplyStrategy && (
                <button
                  className="strategy-apply-button"
                  onClick={(e) => handleApplyClick(e, strategy.value)}
                  title="Apply this strategy and save to plans"
                >
                  Apply Strategy
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

