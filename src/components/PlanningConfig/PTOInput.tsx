import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const PTOInput = ({ value, onChange }: PTOInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input while typing
    if (inputValue === '') {
      onChange(0);
      return;
    }
    
    // Parse the number
    const numValue = parseInt(inputValue, 10);
    
    // Only update if it's a valid number
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    }
  };

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
        value={value === 0 ? '' : value}
        onChange={handleChange}
        className="pto-input-field"
        placeholder="Enter PTO days"
      />
    </div>
  );
};

