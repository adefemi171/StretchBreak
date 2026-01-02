import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { calculateEfficiency } from '../../utils/planningAlgorithm';
import './StatsPanel.css';
export const StatsPanel = ({ vacationDays, holidays, }) => {
    const stats = calculateEfficiency(vacationDays, holidays);
    return (_jsxs("div", { className: "stats-panel", children: [_jsx("h3", { children: "Statistics" }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-label", children: "Vacation Days Used" }), _jsx("div", { className: "stat-value", children: stats.vacationDaysUsed })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-label", children: "Total Days Off" }), _jsx("div", { className: "stat-value", children: stats.totalDaysOff })] })] })] }));
};
