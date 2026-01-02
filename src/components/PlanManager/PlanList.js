import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getAllPlans, deletePlan } from '../../services/planStorage';
import { PlanCard } from './PlanCard';
import { PlanForm } from './PlanForm';
import { ShareModal } from './ShareModal';
import { useState, useEffect } from 'react';
import './PlanList.css';
export const PlanList = ({ onSelectPlan, currentVacationDays, currentHolidays, currentCountryCode, currentYear, }) => {
    const [plans, setPlans] = useState([]);
    const [editingPlan, setEditingPlan] = useState();
    const [showForm, setShowForm] = useState(false);
    const [sharingPlan, setSharingPlan] = useState(null);
    useEffect(() => {
        loadPlans();
    }, []);
    const loadPlans = () => {
        const allPlans = getAllPlans();
        setPlans(allPlans);
    };
    const handleSave = (plan) => {
        const { savePlan } = require('../../services/planStorage');
        savePlan(plan);
        loadPlans();
        setShowForm(false);
        setEditingPlan(undefined);
    };
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this plan?')) {
            deletePlan(id);
            loadPlans();
        }
    };
    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setShowForm(true);
    };
    const handleNewPlan = () => {
        setEditingPlan(undefined);
        setShowForm(true);
    };
    return (_jsxs("div", { className: "plan-list", children: [_jsxs("div", { className: "plan-list-header", children: [_jsx("h2", { children: "Saved Plans" }), _jsx("button", { onClick: handleNewPlan, className: "new-plan-button", children: "+ New Plan" })] }), showForm && (_jsx(PlanForm, { plan: editingPlan, vacationDays: currentVacationDays, holidays: currentHolidays, countryCode: currentCountryCode, year: currentYear, onSave: handleSave, onCancel: () => {
                    setShowForm(false);
                    setEditingPlan(undefined);
                } })), plans.length === 0 && !showForm ? (_jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "No saved plans yet. Create your first plan!" }), _jsx("button", { onClick: handleNewPlan, className: "new-plan-button", children: "Create Plan" })] })) : (_jsx("div", { className: "plans-grid", children: plans.map(plan => (_jsx(PlanCard, { plan: plan, onEdit: handleEdit, onDelete: handleDelete, onSelect: onSelectPlan, onShare: setSharingPlan }, plan.id))) })), sharingPlan && (_jsx(ShareModal, { plan: sharingPlan, onClose: () => setSharingPlan(null) }))] }));
};
