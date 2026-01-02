import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const PTOInput = ({ value, onChange }: PTOInputProps) => {
  return (
    <div className="pto-input">
      <label htmlFor="pto-days" className="pto-label">
        Available PTO Days
      </label>
      <p className="pto-description">
        Enter how many paid time off days you have available. The app will optimize their use.
      </p>
      <input
        id="pto-days"
        type="number"
        min="0"
        max="365"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="pto-input-field"
        placeholder="Enter PTO days"
      />
    </div>
  );
};

