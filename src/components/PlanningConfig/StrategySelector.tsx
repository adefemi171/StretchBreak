import type { VacationStrategy } from '../../utils/types';
import './StrategySelector.css';

interface StrategySelectorProps {
  value?: VacationStrategy;
  onChange: (strategy: VacationStrategy) => void;
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

export const StrategySelector = ({ value, onChange }: StrategySelectorProps) => {
  return (
    <div className="strategy-selector">
      <label className="strategy-label">Choose Your Strategy</label>
      <p className="strategy-subtitle">Select how you'd like to distribute your time off</p>
      <div className="strategy-options">
        {strategies.map((strategy) => (
          <div
            key={strategy.value}
            className={`strategy-option ${value === strategy.value ? 'selected' : ''}`}
            onClick={() => onChange(strategy.value)}
          >
            <div className="strategy-radio">
              <input
                type="radio"
                name="strategy"
                value={strategy.value}
                checked={value === strategy.value}
                onChange={() => onChange(strategy.value)}
              />
            </div>
            <div className="strategy-content">
              <div className="strategy-name">{strategy.label}</div>
              <div className="strategy-description">{strategy.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

