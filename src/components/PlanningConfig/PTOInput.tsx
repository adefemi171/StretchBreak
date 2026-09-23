import { useState } from 'react';
import { getTotalPTODaysForYear, setTotalPTODaysForYear, getCarryover, setCarryover, getPTOBalanceForYear } from '../../services/ptoTracking';
import './PTOInput.css';

interface PTOInputProps {
  value: number;
  onChange: (value: number) => void;
  onCarryoverChange?: (days: number, expiryMonth: number) => void;
  showRemaining?: boolean;
  planningYear?: number;
  mode?: 'annual' | 'carryover' | 'all';
}

// Keep each field's local text state in one place. A year change remounts the
// fields so the displayed allowance always comes from that year's storage.
export const PTOInput = ({ planningYear = new Date().getFullYear(), mode = 'all', ...props }: PTOInputProps) => (
  <div className={`pto-input pto-input-${mode}`}>
    {mode !== 'carryover' && <AnnualAllowance key={`annual-${planningYear}`} {...props} planningYear={planningYear} />}
    {mode !== 'annual' && <CarryoverAllowance key={`carryover-${planningYear}`} {...props} planningYear={planningYear} />}
  </div>
);

type AllowanceProps = Omit<PTOInputProps, 'mode'> & { planningYear: number };

const AnnualAllowance = ({ onChange, showRemaining = true, planningYear }: AllowanceProps) => {
  const [inputValue, setInputValue] = useState(() => String(getTotalPTODaysForYear(planningYear) || ''));
  const balance = getPTOBalanceForYear(planningYear);
  const handleChange = (text: string) => {
    if (!/^\d{0,3}$/.test(text) || Number(text) > 366) return;
    setInputValue(text);
    const days = Number(text);
    setTotalPTODaysForYear(planningYear, days);
    onChange(days);
  };

  return (
    <div className="pto-annual-field">
      <label htmlFor="pto-days" className="pto-label">Annual PTO allowance</label>
      <input id="pto-days" type="text" inputMode="numeric" pattern="[0-9]*" value={inputValue}
        onChange={event => handleChange(event.target.value)} className="pto-input-field" placeholder="e.g. 20" aria-describedby="pto-allowance-hint" />
      <p id="pto-allowance-hint" className="pto-scope-hint">Your full allowance for {planningYear}, before saved breaks.</p>
      {showRemaining && balance.annualUsed > 0 && <p className="pto-scope-hint">{balance.annualUsed} day{balance.annualUsed === 1 ? '' : 's'} allocated · {balance.annualRemaining} annual days left</p>}
    </div>
  );
};

const CarryoverAllowance = ({ onCarryoverChange, showRemaining = true, planningYear }: AllowanceProps) => {
  const stored = getCarryover(planningYear);
  const hasLegacyCarryover = Number(localStorage.getItem('pto-carryover-days')) > 0;
  const [carryoverDays, setCarryoverDays] = useState(String(stored.days || ''));
  const [expiryMonth, setExpiryMonth] = useState(stored.expiryMonth);
  const balance = getPTOBalanceForYear(planningYear);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const updateCarryover = (text: string, month: number) => {
    if (!/^\d{0,3}$/.test(text) || Number(text) > 366) return;
    setCarryoverDays(text);
    setExpiryMonth(month);
    setCarryover(Number(text), month, planningYear);
    onCarryoverChange?.(Number(text), month);
  };

  return (
    <div className="pto-carryover-section">
      {hasLegacyCarryover && <p>Re-enter previously saved carryover for {planningYear} to confirm its allowance and expiry.</p>}
      <p className="pto-description">Unused days from last year, available until their expiry in {planningYear}.</p>
      <div className="pto-carryover-inputs">
        <div className="pto-carryover-field">
          <label htmlFor="carryover-days" className="pto-field-label">Carryover days</label>
          <input id="carryover-days" type="text" inputMode="numeric" value={carryoverDays}
            onChange={event => updateCarryover(event.target.value, expiryMonth)} className="pto-input-field pto-carryover-input" placeholder="0" />
        </div>
        <div className="pto-carryover-field">
          <label htmlFor="carryover-expiry" className="pto-field-label">Expires end of</label>
          <select id="carryover-expiry" value={expiryMonth} onChange={event => updateCarryover(carryoverDays, Number(event.target.value))}
            className="pto-input-field pto-expiry-select" disabled={!Number(carryoverDays)}>
            <option value={0}>Select month</option>
            {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </div>
      </div>
      {Number(carryoverDays) > 0 && expiryMonth === 0 && <p>Select an expiry month to use these days.</p>}
      {showRemaining && Number(carryoverDays) > 0 && <p className="pto-effective-text">{balance.carryoverRemaining} carryover days left · <strong>{balance.available} available in total</strong></p>}
    </div>
  );
};
