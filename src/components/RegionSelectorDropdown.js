import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import './RegionSelectorDropdown.css';
export const RegionSelectorDropdown = ({ holidays, selectedRegions, onChange, }) => {
    // Extract unique regions from holidays
    const availableRegions = useMemo(() => {
        const regionSet = new Set();
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
        return (_jsxs("div", { className: "region-selector-dropdown", children: [_jsx("label", { htmlFor: "region-select", children: "Region:" }), _jsx("select", { id: "region-select", disabled: true, className: "region-select", title: "No regional holidays available for this country", children: _jsx("option", { value: "all", children: "All Regions (No regional holidays)" }) })] }));
    }
    const handleChange = (e) => {
        const value = e.target.value;
        if (value === 'all' || value === '') {
            onChange([]); // Empty array means all regions
        }
        else {
            onChange([value]); // Single region selected
        }
    };
    // Determine current value - if empty array, show "all", otherwise show first selected region
    const currentValue = selectedRegions.length === 0 ? 'all' : selectedRegions[0];
    return (_jsxs("div", { className: "region-selector-dropdown", children: [_jsx("label", { htmlFor: "region-select", children: "Region:" }), _jsxs("select", { id: "region-select", value: currentValue, onChange: handleChange, className: "region-select", children: [_jsx("option", { value: "all", children: "All Regions" }), availableRegions.map(region => (_jsx("option", { value: region, children: region }, region)))] })] }));
};
