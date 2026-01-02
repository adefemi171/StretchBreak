import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { HolidayPlanner } from './components/HolidayPlanner/HolidayPlanner';
import { StatsPanel } from './components/Statistics/StatsPanel';
import { PlanList } from './components/PlanManager/PlanList';
import { NaturalLanguageInput } from './components/AI/NaturalLanguageInput';
import { ChatAssistant } from './components/AI/ChatAssistant';
import { PlanningConfigPanel } from './components/PlanningConfig/PlanningConfigPanel';
import { ExportPanel } from './components/Export/ExportPanel';
import { CountrySelector } from './components/CountrySelector';
import { RegionSelectorDropdown } from './components/RegionSelectorDropdown';
import { useHolidays } from './hooks/useHolidays';
import { usePlans } from './hooks/usePlans';
import { useAI } from './hooks/useAI';
import { usePreferences } from './hooks/usePreferences';
import { useLocation } from './hooks/useLocation';
import { createPlanId } from './services/planStorage';
import { getSharedPlanFromUrl } from './services/shareService';
import { optimizeByStrategy } from './utils/strategyOptimizer';
import { filterHolidaysByRegions } from './utils/holidayFilter';
import { formatDate, parseDateString } from './utils/dateUtils';
import { startOfYear, endOfYear } from 'date-fns';
import './App.css';
function App() {
    const [countryCode, setCountryCode] = useState(() => {
        const saved = localStorage.getItem('lastCountryCode');
        return saved || 'NL';
    });
    const [selectedDates, setSelectedDates] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [activeTab, setActiveTab] = useState('planner');
    const [shouldApplyAutoDetect, setShouldApplyAutoDetect] = useState(true);
    const [planningConfig, setPlanningConfig] = useState({
        availablePTODays: 0,
        strategy: 'balanced',
        timeframe: {
            type: 'calendar-year',
            year: new Date().getFullYear(),
        },
        companyHolidays: [],
        selectedRegions: [],
    });
    const year = planningConfig.timeframe.type === 'calendar-year'
        ? (planningConfig.timeframe.year || new Date().getFullYear())
        : planningConfig.timeframe.startDate
            ? new Date(planningConfig.timeframe.startDate).getFullYear()
            : new Date().getFullYear();
    const [optimizedSuggestions, setOptimizedSuggestions] = useState([]);
    const [showConfig, setShowConfig] = useState(true);
    const { holidays: allHolidays, loading: holidaysLoading, error: holidaysError } = useHolidays(year, countryCode);
    const holidays = planningConfig.selectedRegions && planningConfig.selectedRegions.length > 0
        ? filterHolidaysByRegions(allHolidays, planningConfig.selectedRegions)
        : allHolidays;
    const { addPlan } = usePlans();
    const { aiSuggestions, loading: aiLoading, error: aiError, generateSuggestions, isAIAvailable } = useAI();
    const { preferences, updateFromPlan } = usePreferences();
    const { detectedCountry, isDetecting, detectLocation } = useLocation();
    useEffect(() => {
        detectLocation();
    }, []);
    useEffect(() => {
        if (holidays.length > 0 && isAIAvailable) {
            generateSuggestions(holidays, year, preferences);
        }
    }, [holidays.length, year, isAIAvailable]);
    useEffect(() => {
        localStorage.setItem('lastCountryCode', countryCode);
    }, [countryCode]);
    useEffect(() => {
        const sharedPlan = getSharedPlanFromUrl();
        if (sharedPlan) {
            const newPlan = {
                id: createPlanId(),
                name: sharedPlan.name || 'Shared Plan',
                description: sharedPlan.description,
                countryCode: sharedPlan.countryCode || 'US',
                year: sharedPlan.year || new Date().getFullYear(),
                vacationDays: sharedPlan.vacationDays || [],
                publicHolidays: sharedPlan.publicHolidays || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            addPlan(newPlan);
            setSelectedPlan(newPlan);
            window.history.replaceState({}, '', window.location.pathname);
            alert(`Shared plan "${newPlan.name}" has been imported!`);
        }
    }, [addPlan]);
    useEffect(() => {
        if (detectedCountry && shouldApplyAutoDetect) {
            setCountryCode(detectedCountry);
            setShouldApplyAutoDetect(false);
        }
    }, [detectedCountry, shouldApplyAutoDetect]);
    const handleCountryChange = (newCountryCode) => {
        setCountryCode(newCountryCode);
        setShouldApplyAutoDetect(false);
    };
    useEffect(() => {
        if (selectedPlan) {
            setSelectedDates(selectedPlan.vacationDays);
            setCountryCode(selectedPlan.countryCode);
            setPlanningConfig(prev => ({
                ...prev,
                timeframe: {
                    ...prev.timeframe,
                    type: 'calendar-year',
                    year: selectedPlan.year,
                },
            }));
            setActiveTab('planner');
            setShowConfig(false);
        }
    }, [selectedPlan]);
    const handleSavePlan = (planName, description) => {
        if (selectedDates.length === 0) {
            alert('Please select some vacation days first');
            return;
        }
        const plan = {
            id: createPlanId(),
            name: planName,
            description,
            countryCode,
            year,
            vacationDays: selectedDates,
            publicHolidays: holidays,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        addPlan(plan);
        updateFromPlan(plan);
        alert('Plan saved successfully!');
    };
    const handleNaturalLanguageSuccess = (_parsed) => {
    };
    const handleOptimize = () => {
        if (planningConfig.availablePTODays === 0) {
            alert('Please enter your available PTO days');
            return;
        }
        if (holidays.length === 0) {
            alert('Please wait for holidays to load, or select a country and year');
            return;
        }
        let startDate;
        let endDate;
        if (planningConfig.timeframe.type === 'calendar-year') {
            const configYear = planningConfig.timeframe.year || new Date().getFullYear();
            startDate = startOfYear(new Date(configYear, 0, 1));
            endDate = endOfYear(new Date(configYear, 0, 1));
        }
        else {
            startDate = planningConfig.timeframe.startDate
                ? parseDateString(planningConfig.timeframe.startDate)
                : new Date();
            endDate = planningConfig.timeframe.endDate
                ? parseDateString(planningConfig.timeframe.endDate)
                : new Date();
        }
        const suggestions = optimizeByStrategy({
            holidays,
            companyHolidays: planningConfig.companyHolidays,
            availablePTODays: planningConfig.availablePTODays,
            strategy: planningConfig.strategy,
            startDate,
            endDate,
        });
        setOptimizedSuggestions(suggestions);
        setShowConfig(false);
        if (suggestions.length > 0) {
            const topSuggestion = suggestions[0];
            const start = new Date(topSuggestion.startDate);
            const end = new Date(topSuggestion.endDate);
            const dates = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(d);
                const isHoliday = holidays.some(h => h.date === dateStr) ||
                    planningConfig.companyHolidays.some(h => h.date === dateStr);
                const dayOfWeek = d.getDay();
                if (!isHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
                    dates.push(dateStr);
                }
            }
            setSelectedDates(dates);
        }
    };
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "\uD83C\uDF89 StretchBreak" }), _jsx("p", { className: "subtitle", children: "Maximize your vacation time with smart planning" })] }), _jsxs("div", { className: "app-controls", children: [_jsxs("div", { className: "location-control", children: [_jsx(CountrySelector, { value: countryCode, onChange: handleCountryChange }), _jsx("button", { onClick: async () => {
                                    setShouldApplyAutoDetect(true);
                                    await detectLocation();
                                }, disabled: isDetecting, className: "refresh-location-button", title: "Refresh and use auto-detected country", children: isDetecting ? '⏳' : '🔄' }), detectedCountry && countryCode === detectedCountry && (_jsx("span", { className: "location-success", title: "Country auto-detected", children: "\u2713" }))] }), _jsx("div", { className: "year-region-controls", children: !holidaysLoading && allHolidays.length > 0 && (_jsx(RegionSelectorDropdown, { holidays: allHolidays, selectedRegions: planningConfig.selectedRegions || [], onChange: (regions) => setPlanningConfig({ ...planningConfig, selectedRegions: regions }) })) })] }), _jsxs("div", { className: "app-tabs", children: [_jsx("button", { className: `tab ${activeTab === 'planner' ? 'active' : ''}`, onClick: () => setActiveTab('planner'), children: "Planner" }), _jsx("button", { className: `tab ${activeTab === 'plans' ? 'active' : ''}`, onClick: () => setActiveTab('plans'), children: "Saved Plans" }), isAIAvailable && (_jsx("button", { className: `tab ${activeTab === 'chat' ? 'active' : ''}`, onClick: () => setActiveTab('chat'), children: "AI Assistant" }))] }), _jsxs("main", { className: "app-main", children: [activeTab === 'planner' && (_jsxs("div", { className: "planner-view", children: [showConfig ? (_jsxs(_Fragment, { children: [_jsx(PlanningConfigPanel, { config: planningConfig, holidays: allHolidays, countryCode: countryCode, onConfigChange: setPlanningConfig, onOptimize: handleOptimize }), holidaysLoading && (_jsx("div", { className: "loading-message", children: "Loading holidays..." })), holidaysError && (_jsxs("div", { className: "error-message", children: ["Error loading holidays: ", holidaysError] }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "config-header", children: _jsx("button", { onClick: () => setShowConfig(true), className: "back-button", children: "\u2190 Back to Configuration" }) }), isAIAvailable && (_jsx(NaturalLanguageInput, { holidays: holidays, year: year, preferences: preferences, onParseSuccess: handleNaturalLanguageSuccess, onError: (error) => alert(error) })), aiLoading && (_jsx("div", { className: "loading-message", children: "\uD83E\uDD16 AI is analyzing holidays and generating suggestions..." })), aiError && (_jsxs("div", { className: "error-message", children: ["\u26A0\uFE0F AI Error: ", aiError] })), _jsx(HolidayPlanner, { holidays: holidays, companyHolidays: planningConfig.companyHolidays, year: year, suggestions: optimizedSuggestions.length > 0 ? optimizedSuggestions : aiSuggestions, selectedDates: selectedDates, onDateChange: setSelectedDates }), _jsx(StatsPanel, { vacationDays: selectedDates, holidays: holidays }), selectedDates.length > 0 && (_jsx(ExportPanel, { plan: {
                                            id: 'current',
                                            name: 'Current Plan',
                                            countryCode,
                                            year,
                                            vacationDays: selectedDates,
                                            publicHolidays: holidays,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                        } })), _jsxs("div", { className: "save-plan-section", children: [_jsx("h3", { children: "Save Your Plan" }), _jsx("button", { onClick: () => {
                                                    const name = prompt('Enter plan name:');
                                                    if (name) {
                                                        const description = prompt('Enter description (optional):');
                                                        handleSavePlan(name, description || undefined);
                                                    }
                                                }, className: "save-button", disabled: selectedDates.length === 0, children: "Save Plan" })] })] })), !holidaysLoading && !holidaysError && holidays.length === 0 && !showConfig && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "Select a country and year to see public holidays and start planning!" }) }))] })), activeTab === 'plans' && (_jsx(PlanList, { onSelectPlan: (plan) => setSelectedPlan(plan), currentVacationDays: selectedDates, currentHolidays: holidays, currentCountryCode: countryCode, currentYear: year })), activeTab === 'chat' && isAIAvailable && (_jsx(ChatAssistant, { holidays: holidays, year: year, currentPlan: selectedDates.length > 0 ? { vacationDays: selectedDates } : undefined, preferences: preferences }))] })] }));
}
export default App;
