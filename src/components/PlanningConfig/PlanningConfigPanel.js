import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrategySelector } from './StrategySelector';
import { PTOInput } from './PTOInput';
import { TimeframeSelector } from './TimeframeSelector';
import { CompanyHolidays } from './CompanyHolidays';
import './PlanningConfigPanel.css';
export const PlanningConfigPanel = ({ config, onConfigChange, onOptimize, }) => {
    const handleStrategyChange = (strategy) => {
        onConfigChange({ ...config, strategy });
    };
    const handlePTODaysChange = (days) => {
        onConfigChange({ ...config, availablePTODays: days });
    };
    const handleTimeframeTypeChange = (type) => {
        onConfigChange({
            ...config,
            timeframe: {
                ...config.timeframe,
                type,
            },
        });
    };
    const handleYearChange = (year) => {
        onConfigChange({
            ...config,
            timeframe: {
                ...config.timeframe,
                year,
            },
        });
    };
    const handleStartDateChange = (date) => {
        onConfigChange({
            ...config,
            timeframe: {
                ...config.timeframe,
                startDate: date,
            },
        });
    };
    const handleEndDateChange = (date) => {
        onConfigChange({
            ...config,
            timeframe: {
                ...config.timeframe,
                endDate: date,
            },
        });
    };
    const handleCompanyHolidayAdd = (holiday) => {
        onConfigChange({
            ...config,
            companyHolidays: [...config.companyHolidays, holiday],
        });
    };
    const handleCompanyHolidayDelete = (id) => {
        onConfigChange({
            ...config,
            companyHolidays: config.companyHolidays.filter(h => h.id !== id),
        });
    };
    const canOptimize = config.availablePTODays > 0;
    return (_jsxs("div", { className: "planning-config-panel", children: [_jsx("h2", { children: "Plan Your Year" }), _jsx("p", { className: "config-subtitle", children: "Complete these steps to optimize your time off throughout the year" }), _jsxs("div", { className: "config-steps", children: [_jsxs("div", { className: "config-step", children: [_jsx("div", { className: "step-number", children: "1" }), _jsx("div", { className: "step-content", children: _jsx(PTOInput, { value: config.availablePTODays, onChange: handlePTODaysChange }) })] }), _jsxs("div", { className: "config-step", children: [_jsx("div", { className: "step-number", children: "2" }), _jsx("div", { className: "step-content", children: _jsx(TimeframeSelector, { type: config.timeframe.type, year: config.timeframe.year, startDate: config.timeframe.startDate, endDate: config.timeframe.endDate, onTypeChange: handleTimeframeTypeChange, onYearChange: handleYearChange, onStartDateChange: handleStartDateChange, onEndDateChange: handleEndDateChange }) })] }), _jsxs("div", { className: "config-step", children: [_jsx("div", { className: "step-number", children: "3" }), _jsx("div", { className: "step-content", children: _jsx(StrategySelector, { value: config.strategy, onChange: handleStrategyChange }) })] }), _jsxs("div", { className: "config-step", children: [_jsx("div", { className: "step-number", children: "4" }), _jsx("div", { className: "step-content", children: _jsx(CompanyHolidays, { holidays: config.companyHolidays, onAdd: handleCompanyHolidayAdd, onDelete: handleCompanyHolidayDelete }) })] })] }), _jsxs("div", { className: "optimize-section", children: [_jsx("button", { onClick: onOptimize, disabled: !canOptimize, className: "optimize-button", children: "Optimize My Time Off" }), !canOptimize && (_jsx("p", { className: "optimize-hint", children: "Please enter your available PTO days to continue" }))] })] }));
};
