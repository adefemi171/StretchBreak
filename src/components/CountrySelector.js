import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getAvailableCountries } from '../services/holidayApi';
import './CountrySelector.css';
export const CountrySelector = ({ value, onChange }) => {
    const [countries, setCountries] = useState([]);
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
    return (_jsxs("div", { className: "country-selector", children: [_jsx("label", { htmlFor: "country-select", children: "Country:" }), _jsxs("select", { id: "country-select", value: value, onChange: (e) => onChange(e.target.value), disabled: loading, className: "country-select", children: [_jsx("option", { value: "", children: "Select a country" }), countries.map(country => (_jsx("option", { value: country.countryCode, children: country.name }, country.countryCode)))] })] }));
};
