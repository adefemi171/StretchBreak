import { useState } from 'react';
import type { SuggestionFilters, SuggestionSortBy } from '../../utils/types';
import { getEmptyFilters } from '../../utils/suggestionFilters';
import './SuggestionFilters.css';

interface SuggestionFiltersProps {
  filters: SuggestionFilters;
  onChange: (filters: SuggestionFilters) => void;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

const SEASONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
];

const SORT_OPTIONS: Array<{ value: SuggestionSortBy; label: string }> = [
  { value: 'efficiency', label: 'Best Efficiency' },
  { value: 'totalDaysOff', label: 'Most Days Off' },
  { value: 'vacationDaysUsed', label: 'Least PTO Used' },
  { value: 'startDate', label: 'Earliest Date' },
];

export const SuggestionFilters = ({ filters, onChange }: SuggestionFiltersProps) => {
  const [showExcludeRange, setShowExcludeRange] = useState(false);
  const [excludeStart, setExcludeStart] = useState('');
  const [excludeEnd, setExcludeEnd] = useState('');

  const toggleMonth = (month: number) => {
    const months = filters.months.includes(month)
      ? filters.months.filter((m) => m !== month)
      : [...filters.months, month];
    onChange({ ...filters, months });
  };

  const toggleSeason = (season: string) => {
    const seasons = filters.seasons.includes(season)
      ? filters.seasons.filter((s) => s !== season)
      : [...filters.seasons, season];
    onChange({ ...filters, seasons });
  };

  const handleAddExcludeRange = () => {
    if (excludeStart && excludeEnd) {
      onChange({
        ...filters,
        excludeDateRanges: [...filters.excludeDateRanges, { start: excludeStart, end: excludeEnd }],
      });
      setExcludeStart('');
      setExcludeEnd('');
      setShowExcludeRange(false);
    }
  };

  const handleRemoveExcludeRange = (index: number) => {
    onChange({
      ...filters,
      excludeDateRanges: filters.excludeDateRanges.filter((_, i) => i !== index),
    });
  };

  const clearFilters = () => {
    onChange(getEmptyFilters());
    setShowExcludeRange(false);
    setExcludeStart('');
    setExcludeEnd('');
  };

  return (
    <div className="suggestion-filters">
      <div className="filter-header">
        <h3>Filter & Sort</h3>
        <button type="button" className="clear-filters-btn" onClick={clearFilters}>
          Clear all
        </button>
      </div>

      <div className="filter-section">
        <label className="filter-label">Months</label>
        <div className="month-chips">
          {MONTHS.map((month) => (
            <button
              key={month.value}
              type="button"
              className={`chip ${filters.months.includes(month.value) ? 'active' : ''}`}
              onClick={() => toggleMonth(month.value)}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Seasons</label>
        <div className="season-chips">
          {SEASONS.map((season) => (
            <button
              key={season.value}
              type="button"
              className={`chip ${filters.seasons.includes(season.value) ? 'active' : ''}`}
              onClick={() => toggleSeason(season.value)}
            >
              {season.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">PTO Duration</label>
        <div className="duration-inputs">
          <input
            type="number"
            min="1"
            placeholder="Min days"
            value={filters.minDuration ?? ''}
            onChange={(e) =>
              onChange({ ...filters, minDuration: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <span className="range-separator">—</span>
          <input
            type="number"
            min="1"
            placeholder="Max days"
            value={filters.maxDuration ?? ''}
            onChange={(e) =>
              onChange({ ...filters, maxDuration: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">Minimum Efficiency</label>
        <input
          type="number"
          step="0.1"
          min="1"
          placeholder="e.g., 2.0"
          value={filters.minEfficiency ?? ''}
          onChange={(e) =>
            onChange({ ...filters, minEfficiency: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <div className="filter-section">
        <label className="filter-label">Exclude Date Ranges</label>
        {filters.excludeDateRanges.length > 0 && (
          <div className="excluded-ranges">
            {filters.excludeDateRanges.map((range, index) => (
              <div key={index} className="excluded-range-item">
                <span>
                  {range.start} — {range.end}
                </span>
                <button type="button" onClick={() => handleRemoveExcludeRange(index)} aria-label="Remove excluded date range">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {showExcludeRange ? (
          <div className="exclude-range-form">
            <input
              type="date"
              value={excludeStart}
              onChange={(e) => setExcludeStart(e.target.value)}
              placeholder="Start date"
            />
            <span className="range-separator">—</span>
            <input
              type="date"
              value={excludeEnd}
              onChange={(e) => setExcludeEnd(e.target.value)}
              placeholder="End date"
            />
            <button type="button" onClick={handleAddExcludeRange} disabled={!excludeStart || !excludeEnd}>
              Add
            </button>
            <button type="button" onClick={() => setShowExcludeRange(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="add-exclude-btn" onClick={() => setShowExcludeRange(true)}>
            + Add exclusion
          </button>
        )}
      </div>

      <div className="filter-section">
        <label htmlFor="sort-by" className="filter-label">
          Sort by
        </label>
        <select
          id="sort-by"
          value={filters.sortBy}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SuggestionSortBy })}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
