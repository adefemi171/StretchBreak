import { useState, useEffect, useRef } from 'react';
import { getTotalPTODays, getRemainingPTODays } from '../../services/ptoTracking';
import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
  showRemaining?: boolean;
}

export const PTOInput = ({ value, onChange, showRemaining = true }: PTOInputProps) => {
  const totalPTO = getTotalPTODays();
  const remainingPTO = getRemainingPTODays();
  const hasSavedPTO = totalPTO > 0;
  const [inputValue, setInputValue] = useState<string>(value === 0 ? '' : value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef<boolean>(false);
  
  // Only sync from props when input is not focused (user finished typing)
  useEffect(() => {
    const isFocused = document.activeElement === inputRef.current;
    if (!isFocused && !isTypingRef.current) {
      setInputValue(value === 0 ? '' : value.toString());
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    isTypingRef.current = true;
    
    // Allow empty input while typing
    if (newValue === '') {
      setInputValue('');
      return;
    }
    
    // Only allow digits
    if (!/^\d+$/.test(newValue)) {
      return;
    }
    
    // Update local state immediately for responsive typing
    // Don't call onChange here - wait for blur
    setInputValue(newValue);
  };
  
  const handleBlur = () => {
    isTypingRef.current = false;
    
    // Parse and update parent only when user finishes typing
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 0) {
      // Invalid value, reset to prop value
      setInputValue(value === 0 ? '' : value.toString());
    } else {
      // Valid value, update parent
      setInputValue(numValue.toString());
      onChange(numValue);
    }
  };

  return (
    <div className="pto-input">
      <label htmlFor="pto-days" className="pto-label">
        {hasSavedPTO ? 'Remaining PTO Days' : 'Available PTO Days'}
      </label>
      <p className="pto-description">
        {hasSavedPTO 
          ? `You have ${remainingPTO} remaining PTO days out of ${totalPTO} total. The app will optimize using your remaining days.`
          : 'Enter how many paid time off days you have available. The app will optimize their use.'}
      </p>
      {hasSavedPTO && showRemaining ? (
        <div className="pto-display">
          <div className="pto-stat">
            <span className="pto-stat-label">Total PTO:</span>
            <span className="pto-stat-value">{totalPTO}</span>
          </div>
          <div className="pto-stat">
            <span className="pto-stat-label">Remaining:</span>
            <span className={`pto-stat-value ${remainingPTO === 0 ? 'pto-zero' : remainingPTO < 5 ? 'pto-low' : ''}`}>
              {remainingPTO}
            </span>
          </div>
        </div>
      ) : (
        <input
          ref={inputRef}
          id="pto-days"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="pto-input-field"
          placeholder="Enter PTO days"
        />
      )}
    </div>
  );
};

