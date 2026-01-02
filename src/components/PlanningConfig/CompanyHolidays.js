import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import './CompanyHolidays.css';
export const CompanyHolidays = ({ holidays, onAdd, onDelete }) => {
    const [date, setDate] = useState('');
    const [name, setName] = useState('');
    const handleAdd = () => {
        if (!date || !name.trim()) {
            alert('Please enter both date and holiday name');
            return;
        }
        onAdd({
            id: `company-${Date.now()}`,
            date,
            name: name.trim(),
        });
        setDate('');
        setName('');
    };
    return (_jsxs("div", { className: "company-holidays", children: [_jsx("label", { className: "company-holidays-label", children: "Company Holidays" }), _jsx("p", { className: "company-holidays-description", children: "Add company-specific non-working days to improve your vacation planning" }), _jsxs("div", { className: "add-holiday-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "holiday-date", children: "Date" }), _jsx("input", { id: "holiday-date", type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "date-input" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "holiday-name", children: "Holiday Name" }), _jsx("input", { id: "holiday-name", type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "Enter holiday name", className: "name-input" })] }), _jsx("button", { onClick: handleAdd, className: "add-button", children: "Add Holiday" })] }), holidays.length > 0 && (_jsxs("div", { className: "holidays-list", children: [_jsx("h4", { children: "Added Company Holidays" }), _jsx("div", { className: "holidays-grid", children: holidays.map((holiday) => (_jsxs("div", { className: "holiday-item", children: [_jsxs("div", { className: "holiday-info", children: [_jsx("span", { className: "holiday-date", children: formatDate(new Date(holiday.date)) }), _jsx("span", { className: "holiday-name", children: holiday.name })] }), _jsx("button", { onClick: () => onDelete(holiday.id), className: "delete-holiday-button", title: "Remove holiday", children: "\u00D7" })] }, holiday.id))) })] }))] }));
};
