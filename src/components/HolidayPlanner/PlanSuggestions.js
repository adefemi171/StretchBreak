import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDateDisplay, parseDateString } from '../../utils/dateUtils';
import './PlanSuggestions.css';
export const PlanSuggestions = ({ suggestions, onApplySuggestion, }) => {
    if (suggestions.length === 0) {
        return (_jsx("div", { className: "plan-suggestions empty", children: _jsx("p", { children: "No suggestions available. Try selecting a country and year." }) }));
    }
    // Sort suggestions chronologically by start date
    const sortedSuggestions = [...suggestions].sort((a, b) => {
        const dateA = parseDateString(a.startDate);
        const dateB = parseDateString(b.startDate);
        return dateA.getTime() - dateB.getTime();
    });
    return (_jsxs("div", { className: "plan-suggestions", children: [_jsx("h3", { children: "Optimal Vacation Suggestions" }), _jsx("div", { className: "suggestions-list", children: sortedSuggestions.map((suggestion, index) => (_jsxs("div", { className: "suggestion-card", children: [_jsxs("div", { className: "suggestion-header", children: [_jsxs("span", { className: "suggestion-rank", children: ["#", index + 1] }), _jsxs("span", { className: "suggestion-dates", children: [formatDateDisplay(suggestion.startDate), " - ", formatDateDisplay(suggestion.endDate)] })] }), _jsxs("div", { className: "suggestion-details", children: [_jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Vacation Days:" }), _jsx("span", { className: "value", children: suggestion.vacationDaysUsed })] }), _jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Total Days Off:" }), _jsx("span", { className: "value", children: suggestion.totalDaysOff })] })] }), _jsx("p", { className: "suggestion-reason", children: suggestion.reason }), _jsx("button", { className: "apply-button", onClick: () => onApplySuggestion(suggestion), children: "Apply This Plan" })] }, index))) })] }));
};
