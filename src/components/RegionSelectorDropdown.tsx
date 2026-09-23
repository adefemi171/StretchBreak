import { useId, useMemo } from 'react';
import type { PublicHoliday } from '../utils/types';
import { getRegionLabel } from '../utils/regionNames';
import './RegionSelectorDropdown.css';

interface RegionSelectorDropdownProps {
  holidays: PublicHoliday[];
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
}

export const RegionSelectorDropdown = ({ holidays, selectedRegions, onChange }: RegionSelectorDropdownProps) => {
  const id = useId();
  const availableRegions = useMemo(() => [...new Set(holidays.flatMap(h => h.counties || []))]
    .sort((a, b) => getRegionLabel(a).localeCompare(getRegionLabel(b))), [holidays]);
  const currentValue = availableRegions.includes(selectedRegions[0]) ? selectedRegions[0] : '';
  return (
    <div className="region-selector-dropdown">
      <label htmlFor={id}>Work region</label>
      <select id={id} value={currentValue} onChange={e => onChange(e.target.value ? [e.target.value] : [])}
        className="region-select" disabled={!availableRegions.length} aria-describedby={`${id}-help`}>
        <option value="">National holidays only</option>
        {availableRegions.map(region => <option key={region} value={region}>{getRegionLabel(region)}</option>)}
      </select>
      <small id={`${id}-help`} className="region-help">
        {availableRegions.length && !currentValue ? 'Choose your work region to include its public holidays.' : 'Confirm days off with your employer.'}
      </small>
    </div>
  );
};
