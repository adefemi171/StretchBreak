import { useMemo } from 'react';
import type { PublicHoliday } from '../utils/types';
import './RegionSelectorDropdown.css';

interface RegionSelectorDropdownProps {
  holidays: PublicHoliday[];
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
}

export const RegionSelectorDropdown = ({
  holidays,
  selectedRegions,
  onChange,
}: RegionSelectorDropdownProps) => {
  // Extract unique regions from holidays
  const availableRegions = useMemo(() => {
    const regionSet = new Set<string>();
    
    holidays.forEach(holiday => {
      if (holiday.counties && holiday.counties.length > 0) {
        holiday.counties.forEach(county => {
          regionSet.add(county);
        });
      }
    });
    
    return Array.from(regionSet).sort();
  }, [holidays]);
  
  // If no regions available, show a disabled selector with a message
  if (availableRegions.length === 0) {
    return (
      <div className="region-selector-dropdown">
        <label htmlFor="region-select">Region:</label>
        <select
          id="region-select"
          disabled
          className="region-select"
          title="No regional holidays available for this country"
        >
          <option value="all">All Regions (No regional holidays)</option>
        </select>
      </div>
    );
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'all' || value === '') {
      onChange([]); // Empty array means all regions
    } else {
      onChange([value]); // Single region selected
    }
  };
  
  // Determine current value - if empty array, show "all", otherwise show first selected region
  const currentValue = selectedRegions.length === 0 ? 'all' : selectedRegions[0];
  
  return (
    <div className="region-selector-dropdown">
      <label htmlFor="region-select">Region:</label>
      <select
        id="region-select"
        value={currentValue}
        onChange={handleChange}
        className="region-select"
      >
        <option value="all">All Regions</option>
        {availableRegions.map(region => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
    </div>
  );
};

