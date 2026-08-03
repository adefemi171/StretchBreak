import { useState, useEffect, useRef } from 'react';
import {
  getTotalPTODays,
  getRemainingPTODays,
  getRemainingPTODaysForYear,
  getAvailablePTODaysInput,
  setAvailablePTODaysInput,
  setTotalPTODays,
  setTotalPTODaysForYear,
  hasTotalPTODaysForYear,
  getTotalPTODaysForYear,
  getCarryover,
  setCarryover,
  getEffectiveAvailablePTODays,
} from '../../services/ptoTracking';
import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
  onCarryoverChange?: (days: number, expiryMonth: number) => void;
  showRemaining?: boolean;
  planningYear?: number;
}

const resolveInitialInput = (value: number, planningYear?: number): string => {
  if (planningYear !== undefined && hasTotalPTODaysForYear(planningYear)) {
    return getTotalPTODaysForYear(planningYear).toString();
  }
  const persisted = getAvailablePTODaysInput();
  if (persisted > 0) return persisted.toString();
  if (planningYear !== undefined) {
    const yearTotal = getTotalPTODaysForYear(planningYear);
    if (yearTotal > 0) return yearTotal.toString();
  }
  const global = getTotalPTODays();
  if (global > 0) return global.toString();
  return value === 0 ? '' : value.toString();
};

export const PTOInput = ({ value, onChange, onCarryoverChange, showRemaining = true, planningYear }: PTOInputProps) => {
  const [inputValue, setInputValue] = useState<string>(() => resolveInitialInput(value, planningYear));
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef<boolean>(false);
  
  const [carryoverDays, setCarryoverDaysState] = useState<string>(() => {
    const stored = getCarryover();
    return stored.days > 0 ? stored.days.toString() : '';
  });
  
  const [carryoverExpiry, setCarryoverExpiryState] = useState<number>(() => {
    const stored = getCarryover();
    return stored.expiryMonth > 0 ? stored.expiryMonth : 0;
  });
  
  const isTypingCarryoverRef = useRef<boolean>(false);
  const [usingYearSpecific, setUsingYearSpecific] = useState(
    () => planningYear !== undefined && hasTotalPTODaysForYear(planningYear)
  );
  const isYearScoped = planningYear !== undefined;
  
  useEffect(() => {
    const isFocused = document.activeElement === inputRef.current;
    if (!isFocused && !isTypingRef.current) {
      setInputValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  // When planning year changes, show that year's stored total (or global fallback)
  useEffect(() => {
    if (planningYear === undefined) {
      setUsingYearSpecific(false);
      return;
    }
    setUsingYearSpecific(hasTotalPTODaysForYear(planningYear));
    if (isTypingRef.current) return;
    setInputValue(resolveInitialInput(value, planningYear));
  }, [planningYear]);
  
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
      // Replace Total PTO (not add) — year-scoped when planning year is known
      if (numValue > 0) {
        if (planningYear !== undefined) {
          setTotalPTODaysForYear(planningYear, numValue);
          setUsingYearSpecific(true);
        }
        setTotalPTODays(numValue);
      }
      onChange(numValue);
    }
  };
  
  const handleCarryoverDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    isTypingCarryoverRef.current = true;
    
    if (newValue === '') {
      setCarryoverDaysState('');
      return;
    }
    
    if (!/^\d+$/.test(newValue)) {
      return;
    }
    
    setCarryoverDaysState(newValue);
  };
  
  const handleCarryoverDaysBlur = () => {
    isTypingCarryoverRef.current = false;
    
    const numDays = parseInt(carryoverDays, 10);
    if (isNaN(numDays) || numDays < 0) {
      setCarryoverDaysState('');
      setCarryover(0, 0);
      if (onCarryoverChange) {
        onCarryoverChange(0, 0);
      }
    } else {
      setCarryoverDaysState(numDays.toString());
      const expiry = carryoverExpiry > 0 ? carryoverExpiry : 0;
      setCarryover(numDays, expiry);
      if (onCarryoverChange) {
        onCarryoverChange(numDays, expiry);
      }
      // Update effective available PTO
      const effective = getEffectiveAvailablePTODays(new Date(), planningYear);
      onChange(effective);
    }
  };
  
  const handleCarryoverExpiryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value, 10);
    setCarryoverExpiryState(month);
    
    const numDays = parseInt(carryoverDays, 10);
    if (!isNaN(numDays) && numDays > 0) {
      setCarryover(numDays, month);
      if (onCarryoverChange) {
        onCarryoverChange(numDays, month);
      }
      // Update effective available PTO
      const effective = getEffectiveAvailablePTODays(new Date(), planningYear);
      onChange(effective);
    }
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Calculate effective available for display (year-scoped when planning year is known)
  const annualRemaining = planningYear !== undefined
    ? getRemainingPTODaysForYear(planningYear)
    : getRemainingPTODays();
  const carryoverNum = parseInt(carryoverDays, 10) || 0;
  const isCarryoverActive = carryoverNum > 0 && carryoverExpiry > 0;
  const effectiveTotal = isCarryoverActive 
    ? getEffectiveAvailablePTODays(new Date(), planningYear)
    : annualRemaining;

  return (
    <div className="pto-input">
      <label htmlFor="pto-days" className="pto-label">
        Available PTO Days
        {isYearScoped && (
          <span className="pto-year-badge"> for {planningYear}</span>
        )}
      </label>
      <p className="pto-description">
        Enter how many paid time off days you have available
        {isYearScoped ? ` in ${planningYear}` : ''}. The app will optimize their use.
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
      {isYearScoped && (
        <p className={`pto-scope-hint ${usingYearSpecific ? 'year-specific' : 'global-fallback'}`}>
          {usingYearSpecific
            ? `Saved as ${planningYear} total`
            : 'Using global default until you save a year-specific total'}
        </p>
      )}
      
      <div className="pto-carryover-section">
        <label className="pto-label pto-carryover-label">
          Carryover PTO (Optional)
        </label>
        <p className="pto-description">
          Add carryover days from last year with an expiry month.
        </p>
        <div className="pto-carryover-inputs">
          <div className="pto-carryover-field">
            <label htmlFor="carryover-days" className="pto-field-label">
              Carryover days
            </label>
            <input
              id="carryover-days"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={carryoverDays}
              onChange={handleCarryoverDaysChange}
              onBlur={handleCarryoverDaysBlur}
              className="pto-input-field pto-carryover-input"
              placeholder="0"
            />
          </div>
          <div className="pto-carryover-field">
            <label htmlFor="carryover-expiry" className="pto-field-label">
              Expires end of
            </label>
            <select
              id="carryover-expiry"
              value={carryoverExpiry}
              onChange={handleCarryoverExpiryChange}
              className="pto-input-field pto-expiry-select"
              disabled={!carryoverDays || carryoverDays === '0'}
            >
              <option value={0}>Select month</option>
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {isCarryoverActive && showRemaining && (
          <div className="pto-effective-display">
            <p className="pto-effective-text">
              <strong>{annualRemaining}</strong> annual + <strong>{carryoverNum}</strong> carryover (until {monthNames[carryoverExpiry - 1]}) = <strong className="pto-effective-total">{effectiveTotal} available</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
