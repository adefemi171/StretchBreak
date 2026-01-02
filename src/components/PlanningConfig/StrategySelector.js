import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './StrategySelector.css';
const strategies = [
    {
        value: 'balanced',
        label: 'Flexible Approach',
        description: 'A mix of short getaways and longer vacations throughout the year',
    },
    {
        value: 'long-weekends',
        label: 'Weekend Focus',
        description: 'Prioritize extending weekends into 3-4 day mini vacations',
    },
    {
        value: 'mini-breaks',
        label: 'Short Getaways',
        description: 'Multiple brief 5-6 day escapes distributed across the year',
    },
    {
        value: 'week-long',
        label: 'Full Week Vacations',
        description: 'Plan substantial 7-9 day blocks for meaningful time away',
    },
    {
        value: 'extended',
        label: 'Deep Breaks',
        description: 'Longer 10-15 day periods for extended rest and travel',
    },
];
export const StrategySelector = ({ value, onChange }) => {
    return (_jsxs("div", { className: "strategy-selector", children: [_jsx("label", { className: "strategy-label", children: "Choose Your Strategy" }), _jsx("p", { className: "strategy-subtitle", children: "Select how you'd like to distribute your time off" }), _jsx("div", { className: "strategy-options", children: strategies.map((strategy) => (_jsxs("div", { className: `strategy-option ${value === strategy.value ? 'selected' : ''}`, onClick: () => onChange(strategy.value), children: [_jsx("div", { className: "strategy-radio", children: _jsx("input", { type: "radio", name: "strategy", value: strategy.value, checked: value === strategy.value, onChange: () => onChange(strategy.value) }) }), _jsxs("div", { className: "strategy-content", children: [_jsx("div", { className: "strategy-name", children: strategy.label }), _jsx("div", { className: "strategy-description", children: strategy.description })] })] }, strategy.value))) })] }));
};
