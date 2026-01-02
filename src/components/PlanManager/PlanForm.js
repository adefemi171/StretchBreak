import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import './PlanForm.css';
export const PlanForm = ({ plan, vacationDays, holidays, countryCode, year, onSave, onCancel, }) => {
    const [name, setName] = useState(plan?.name || '');
    const [description, setDescription] = useState(plan?.description || '');
    useEffect(() => {
        if (plan) {
            setName(plan.name);
            setDescription(plan.description || '');
        }
    }, [plan]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please enter a plan name');
            return;
        }
        const planToSave = {
            id: plan?.id || `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            description: description.trim() || undefined,
            countryCode,
            year,
            vacationDays,
            publicHolidays: holidays,
            createdAt: plan?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onSave(planToSave);
    };
    return (_jsxs("form", { className: "plan-form", onSubmit: handleSubmit, children: [_jsx("h3", { children: plan ? 'Edit Plan' : 'Save Plan' }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "plan-name", children: "Plan Name *" }), _jsx("input", { id: "plan-name", type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g., Summer 2024 Vacation", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "plan-description", children: "Description" }), _jsx("textarea", { id: "plan-description", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Optional description...", rows: 3 })] }), _jsxs("div", { className: "form-info", children: [_jsxs("p", { children: ["Vacation Days: ", vacationDays.length] }), _jsxs("p", { children: ["Public Holidays: ", holidays.length] })] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "button", onClick: onCancel, className: "cancel-button", children: "Cancel" }), _jsxs("button", { type: "submit", className: "save-button", children: [plan ? 'Update' : 'Save', " Plan"] })] })] }));
};
