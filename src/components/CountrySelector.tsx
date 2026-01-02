import { useState, useEffect } from 'react';
import { getAvailableCountries } from '../services/holidayApi';
import './CountrySelector.css';

interface CountrySelectorProps {
  value: string;
  onChange: (countryCode: string) => void;
}

export const CountrySelector = ({ value, onChange }: CountrySelectorProps) => {
  const [countries, setCountries] = useState<Array<{ countryCode: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getAvailableCountries()
      .then(data => {
        setCountries(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      })
      .catch(() => {
        // Fallback countries
        setCountries([
          { countryCode: 'NL', name: 'Netherlands' },
          { countryCode: 'GB', name: 'United Kingdom' },
          { countryCode: 'DE', name: 'Germany' },
          { countryCode: 'CH', name: 'Switzerland' },
        ]);
        setLoading(false);
      });
  }, []);
  
  return (
    <div className="country-selector">
      <label htmlFor="country-select">Country:</label>
      <select
        id="country-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="country-select"
      >
        <option value="">Select a country</option>
        {countries.map(country => (
          <option key={country.countryCode} value={country.countryCode}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
};

