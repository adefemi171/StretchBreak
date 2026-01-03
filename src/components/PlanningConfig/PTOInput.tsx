import { useState, useEffect, useRef } from 'react';
import { getTotalPTODays, getRemainingPTODays, getAvailablePTODaysInput, setAvailablePTODaysInput, setTotalPTODays } from '../../services/ptoTracking';
import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
  showRemaining?: boolean;
}

export const PTOInput = ({ value, onChange, showRemaining = true }: PTOInputProps) => {
  const [inputValue, setInputValue] = useState<string>(() => {
    const persisted = getAvailablePTODaysInput();
    return persisted > 0 ? persisted.toString() : (value === 0 ? '' : value.toString());
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef<boolean>(false);
  
  useEffect(() => {
    const isFocused = document.activeElement === inputRef.current;
    if (!isFocused && !isTypingRef.current) {
      setInputValue(value === 0 ? '' : value.toString());
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    isTypingRef.current = true;
    
    if (newValue === '') {
      setInputValue('');
      return;
    }
    
    if (!/^\d+$/.test(newValue)) {
      return;
    }
    
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
      // Persist the input value
      setAvailablePTODaysInput(numValue);
      // Replace Total PTO (not add)
      if (numValue > 0) {
        setTotalPTODays(numValue);
      }
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
    </div>
  );
};

