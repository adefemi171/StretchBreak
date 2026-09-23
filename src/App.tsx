import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HolidayPlanner } from './components/HolidayPlanner/HolidayPlanner';
import { Calendar } from './components/Calendar/Calendar';
import { PlanList } from './components/PlanManager/PlanList';
import { PlanBreakdown } from './components/PlanManager/PlanBreakdown';
import { PlanVersions } from './components/PlanManager/PlanVersions';
import { MultiYearOverview } from './components/MultiYear/MultiYearOverview';
import { ChatAssistant } from './components/AI/ChatAssistant';
import { PlanningConfigPanel } from './components/PlanningConfig/PlanningConfigPanel';
import { ExportPanel } from './components/Export/ExportPanel';
import { CountrySelector } from './components/CountrySelector';
import { RegionSelectorDropdown } from './components/RegionSelectorDropdown';
import { VacationAnalytics } from './components/Analytics/VacationAnalytics';
import { OfflineIndicator } from './components/OfflineIndicator/OfflineIndicator';
import { TeamPanel } from './components/Team/TeamPanel';
import { WishlistPanel } from './components/Wishlist/WishlistPanel';
import { PublicCalendarToggle } from './components/Social/PublicCalendarToggle';
import { useMultiYearHolidays } from './hooks/useMultiYearHolidays';
import { usePlans } from './hooks/usePlans';
import { useAI } from './hooks/useAI';
import { usePreferences } from './hooks/usePreferences';
import { useTheme } from './hooks/useTheme';
import { useAccessibility } from './hooks/useAccessibility';
import { createPlanId } from './services/planStorage';
import { getSharedPlanFromUrl, getSharedTemplateFromUrl } from './services/shareService';
import { saveTemplate } from './services/templateStorage';
import { hasSavedPlansWithPTO, getCarryover, getEffectiveAvailablePTODays, getPTOBalanceForYear, canAllocatePTODates } from './services/ptoTracking';
import { clearAppStorage } from './services/backupService';
import { getLeaveDates, getVacationBreaks, normalizeSuggestion } from './utils/planningAlgorithm';
import { HolidayApplicability } from './components/HolidayApplicability';
import { HolidayDataNotice } from './components/HolidayDataNotice';
import { AIAccessPanel } from './components/AI/AIAccessPanel';
import { SettingsTab } from './components/Settings/SettingsTab';
import { NaturalLanguageInput } from './components/NaturalLanguage/NaturalLanguageInput';
import { StretchShare } from './components/Share/StretchShare';
import { BudgetCalculator } from './components/Budget/BudgetCalculator';
import { optimizeByStrategy } from './utils/strategyOptimizer';
import { filterHolidaysByRegions } from './utils/holidayFilter';
import { parseDateString, formatDate, formatDateDisplay, DEFAULT_WORK_DAYS } from './utils/dateUtils';
import { checkRemindersOnLoad } from './services/reminderService';
import { startOfYear, endOfYear, parseISO } from 'date-fns';
import type { HolidayPlan, PlanningConfig, PlanSuggestion, VacationStrategy } from './utils/types';
import './App.css';

function App() {
  const [countryCode, setCountryCode] = useState(() => {
    const saved = localStorage.getItem('lastCountryCode');
    return saved || 'NL';
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [calendarFocusDates, setCalendarFocusDates] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<HolidayPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'plans' | 'settings'>('planner');
  const [showMultiYearView, setShowMultiYearView] = useState(false);
  const plannerViewRef = useRef<HTMLDivElement>(null);
  
  const [planningConfig, setPlanningConfig] = useState<PlanningConfig>(() => {
    const year = new Date().getFullYear();
    const carryover = getCarryover(year);
    return {
      availablePTODays: getEffectiveAvailablePTODays(new Date(), year),
      timeframe: { type: 'calendar-year', year },
      companyHolidays: [], selectedRegions: [], workDays: [1, 2, 3, 4, 5],
      carryover: carryover.days > 0 ? carryover : undefined,
    };
  });

  const year = planningConfig.timeframe.type === 'calendar-year' 
    ? (planningConfig.timeframe.year || new Date().getFullYear())
    : planningConfig.timeframe.startDate 
      ? parseISO(planningConfig.timeframe.startDate).getFullYear()
      : new Date().getFullYear();

  const planningYears = useMemo(() => {
    if (
      planningConfig.timeframe.type === 'custom' &&
      planningConfig.timeframe.startDate &&
      planningConfig.timeframe.endDate
    ) {
      const startY = parseISO(planningConfig.timeframe.startDate).getFullYear();
      const endY = parseISO(planningConfig.timeframe.endDate).getFullYear();
      const years: number[] = [];
      for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
        years.push(y);
      }
      return years.length > 0 ? years : [year];
    }
    return [year];
  }, [
    planningConfig.timeframe.type,
    planningConfig.timeframe.startDate,
    planningConfig.timeframe.endDate,
    year,
  ]);

  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [showConfig, setShowConfig] = useState(() => {
    // Don't show config if there are saved plans with PTO
    return !hasSavedPlansWithPTO();
  });
  
  const { holidaysByYear, metadataByYear, loading: holidaysLoading, error: holidaysError } = useMultiYearHolidays(planningYears, countryCode);
  const allHolidays = useMemo(
    () => Array.from(holidaysByYear.values()).flat(),
    [holidaysByYear]
  );
  
  const holidays = useMemo(() => filterHolidaysByRegions(allHolidays, planningConfig.selectedRegions || [], planningConfig.excludedHolidayDates || []), [allHolidays, planningConfig.selectedRegions, planningConfig.excludedHolidayDates]);
  const workDays = planningConfig.workDays || DEFAULT_WORK_DAYS;
  const combinedHolidays = useMemo(() => [...holidays, ...planningConfig.companyHolidays.map(h => ({ date: h.date, name: h.name, localName: h.name, countryCode, global: true, fixed: true, counties: null, types: ['Public'], launchYear: null }))], [holidays, planningConfig.companyHolidays, countryCode]);
  const { addPlan, updatePlan, deletePlan, plans, loadPlans } = usePlans();
  const { aiSuggestions, loading: aiLoading, error: aiError, generateSuggestions, isAIAvailable, clearSuggestions, refreshAvailability } = useAI();
  const { preferences, updateFromPlan } = usePreferences();
  const { themeMode, setThemeMode } = useTheme();
  const { contrast, setContrast, fontScale, setFontScale } = useAccessibility();
  
  useEffect(() => {
    checkRemindersOnLoad();
  }, []);
  
  useEffect(() => {
    localStorage.setItem('lastCountryCode', countryCode);
  }, [countryCode]);
  
  const viewPlan = useCallback((plan: HolidayPlan) => {
    setSelectedPlan(plan);
    setSelectedDates(plan.vacationDays);
    setCalendarFocusDates(plan.vacationDays);
    setCountryCode(plan.countryCode);
    setPlanningConfig(prev => ({ ...prev,
      timeframe: plan.timeframe || { type: 'calendar-year', year: plan.year },
      selectedRegions: plan.selectedRegions || [], excludedHolidayDates: plan.excludedHolidayDates || [],
      workDays: plan.workDays || DEFAULT_WORK_DAYS, companyHolidays: plan.companyHolidays || [],
    }));
    clearSuggestions();
    setShowConfig(false);
    setActiveTab('plans');
  }, [clearSuggestions]);

  useEffect(() => {
    const sharedPlan = getSharedPlanFromUrl();
    if (!sharedPlan) return;

    const planName = sharedPlan.name || 'Shared Plan';
    const dayCount = Array.isArray(sharedPlan.vacationDays) ? sharedPlan.vacationDays.length : 0;
    const shouldImport = window.confirm(
      `Import shared plan "${planName}" (${dayCount} vacation day${dayCount === 1 ? '' : 's'})?\n\n` +
        'This will save it as a new plan on this device. Links are not encrypted — only import plans you trust.'
    );

    window.history.replaceState({}, '', window.location.pathname);
    if (!shouldImport) return;

    const newPlan: HolidayPlan = {
      id: createPlanId(),
      name: planName,
      description: sharedPlan.description,
      countryCode: sharedPlan.countryCode || 'US',
      year: sharedPlan.year || new Date().getFullYear(),
      vacationDays: sharedPlan.vacationDays || [],
      publicHolidays: sharedPlan.publicHolidays || [],
      companyHolidays: sharedPlan.companyHolidays,
      selectedRegions: sharedPlan.selectedRegions,
      excludedHolidayDates: sharedPlan.excludedHolidayDates,
      workDays: sharedPlan.workDays,
      timeframe: sharedPlan.timeframe,
      holidaySource: sharedPlan.holidaySource,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPlan(newPlan);
    // This one-time effect hydrates a plan from the browser URL after confirmation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    viewPlan(newPlan);
    setActiveTab('plans');
  }, [addPlan, viewPlan]);

  useEffect(() => {
    const sharedTemplate = getSharedTemplateFromUrl();
    if (!sharedTemplate) return;

    const shouldImport = window.confirm(
      `Import vacation template "${sharedTemplate.name}" on this device?\n\n` +
        'Local import only — not a cloud marketplace. Links are not encrypted.'
    );
    window.history.replaceState({}, '', window.location.pathname);
    if (!shouldImport) return;

    saveTemplate(sharedTemplate);
  }, []);
  
  const handleCountryChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    setPlanningConfig(prev => ({ ...prev, selectedRegions: [], excludedHolidayDates: [], companyHolidays: [] }));
    setSelectedDates([]);
    setSelectedPlan(null);
    clearSuggestions();
    setCalendarFocusDates([]);
  };

  const applySuggestionToPlan = (suggestion: PlanSuggestion) => {
    const dates = getLeaveDates(suggestion.startDate, suggestion.endDate, combinedHolidays, workDays);
    if (!dates.length || dates.some(date => !planningYears.includes(Number(date.slice(0, 4))))) return;
    if (planningYears.some(y => !canAllocatePTODates(dates.filter(d => Number(d.slice(0, 4)) === y), y))) {
      alert('This break exceeds your available leave or uses carryover after it expires. Adjust your allowance or dates.');
      return;
    }
    setSelectedDates(dates);
    setCalendarFocusDates(dates);
    setSelectedPlan(null);
    setShowConfig(false);
    setActiveTab('planner');
  };

  const rangeStart = planningConfig.timeframe.type === 'custom' && planningConfig.timeframe.startDate
    ? parseDateString(planningConfig.timeframe.startDate) : startOfYear(new Date(year, 0, 1));
  const rangeEnd = planningConfig.timeframe.type === 'custom' && planningConfig.timeframe.endDate
    ? parseDateString(planningConfig.timeframe.endDate) : endOfYear(new Date(year, 0, 1));
  const rangeStartKey = formatDate(rangeStart);
  const rangeEndKey = formatDate(rangeEnd);
  const todayKey = formatDate(new Date());
  // Storage changes are made alongside config/plan state updates.
  const budgetKey = JSON.stringify(planningYears.map(y => ({ year: y, ...getPTOBalanceForYear(y), carryover: getCarryover(y) })));
  const availablePTO = planningYears.reduce((sum, y) => sum + getEffectiveAvailablePTODays(new Date(), y), 0);
  const balance = getPTOBalanceForYear(year);
  const buildSuggestions = useCallback((strategy: VacationStrategy = planningConfig.strategy || 'balanced') => {
    if (holidaysLoading || holidaysError || rangeEndKey < rangeStartKey || rangeEndKey < todayKey) return [];
    const budgets: Array<ReturnType<typeof getPTOBalanceForYear> & { year: number; carryover: ReturnType<typeof getCarryover> }> = JSON.parse(budgetKey);
    return budgets.flatMap(budget => {
      const first = [rangeStartKey, todayKey, `${budget.year}-01-01`].sort().at(-1)!;
      const last = [rangeEndKey, `${budget.year}-12-31`].sort()[0];
      if (first > last || !budget.available) return [];
      return optimizeByStrategy({
        holidays, companyHolidays: planningConfig.companyHolidays,
        availablePTODays: budget.available, strategy, workDays,
        startDate: parseDateString(first), endDate: parseDateString(last),
        carryover: budget.carryoverRemaining > 0 ? { ...budget.carryover, days: budget.carryoverRemaining } : undefined,
      }).filter(suggestion => {
        const dates = getLeaveDates(suggestion.startDate, suggestion.endDate, combinedHolidays, workDays);
        return dates.length > 0 && canAllocatePTODates(dates, budget.year);
      });
    });
  }, [holidaysLoading, holidaysError, rangeEndKey, rangeStartKey, todayKey, budgetKey, holidays, planningConfig.companyHolidays, planningConfig.strategy, workDays, combinedHolidays]);
  const optimizedSuggestions = useMemo(() => buildSuggestions(), [buildSuggestions]);
  const contextKey = JSON.stringify([countryCode, planningConfig, budgetKey, holidays.map(h => h.date)]);
  const [aiContextKey, setAIContextKey] = useState('');
  const visibleAISuggestions = aiContextKey === contextKey ? aiSuggestions
    .map(suggestion => normalizeSuggestion(suggestion, combinedHolidays, workDays))
    .filter((suggestion): suggestion is PlanSuggestion => !!suggestion && suggestion.startDate >= rangeStartKey && suggestion.endDate <= rangeEndKey && suggestion.startDate >= todayKey &&
      planningYears.every(y => canAllocatePTODates((suggestion.leaveDates || []).filter(d => Number(d.slice(0, 4)) === y), y))) : [];
  const suggestions = visibleAISuggestions.length > 0 ? visibleAISuggestions : optimizedSuggestions;
  const handleConfigChange = (config: PlanningConfig) => {
    setPlanningConfig(config);
    setSelectedDates([]);
    setSelectedPlan(null);
    clearSuggestions();
  };
  const handleOptimize = () => {
    if (holidaysLoading || holidaysError || !availablePTO || !countryCode) return;
    setShowConfig(false);
  };
  const previewStrategy = (strategy: VacationStrategy) => {
    setPlanningConfig(prev => ({ ...prev, strategy }));
    const top = buildSuggestions(strategy)[0];
    if (top) applySuggestionToPlan(top);
  };
  const snapshotFields = {
    selectedRegions: planningConfig.selectedRegions,
    excludedHolidayDates: planningConfig.excludedHolidayDates,
    workDays, timeframe: planningConfig.timeframe,
    holidaySource: metadataByYear.get(year), companyHolidays: planningConfig.companyHolidays,
  };
  const currentBreaks = getVacationBreaks(selectedDates, combinedHolidays, workDays);
  const handleSavePlan = (name: string, description?: string): boolean => {
    if (!selectedDates.length) return false;
    const validLeave = new Set(selectedDates.filter(date => getLeaveDates(date, date, combinedHolidays, workDays).length === 1));
    if (selectedDates.some(date => !validLeave.has(date) || date < formatDate(rangeStart) || date > formatDate(rangeEnd)) || planningYears.some(y => !canAllocatePTODates(selectedDates.filter(d => Number(d.slice(0, 4)) === y), y))) {
      alert('These dates exceed your allowance, fall outside your timeframe, or are not working days. Review the selection before saving.');
      return false;
    }
    const plan: HolidayPlan = {
      id: createPlanId(), name, description, countryCode, year,
      vacationDays: selectedDates, publicHolidays: holidays, ...snapshotFields,
      strategy: planningConfig.strategy, availablePTODays: balance.annualTotal,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    addPlan(plan);
    updateFromPlan(plan);
    setSelectedPlan(plan);
    setSelectedDates(plan.vacationDays);
    return true;
  };

  const savedHolidays = selectedPlan ? [...selectedPlan.publicHolidays, ...(selectedPlan.companyHolidays || []).map(h => ({ ...h, localName: h.name, countryCode: selectedPlan.countryCode, global: true, fixed: true, counties: null, types: ['Public'], launchYear: null }))] : [];
  const savedBreaks = selectedPlan ? getVacationBreaks(selectedPlan.vacationDays, savedHolidays, selectedPlan.workDays) : [];

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset everything? This will:\n\n- Delete plans, versions, team entries, budgets and preferences\n- Clear PTO and saved integration settings\n- Reset this browser to a fresh start\n\nThis action cannot be undone.')) {
      clearAppStorage();
      window.location.reload();
      

    }
  };

  const countryName = /^[A-Z]{2}$/.test(countryCode) ? new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode : 'Choose a country';
  const step = showConfig ? 0 : selectedDates.length ? 2 : 1;
  const remainingPTO = planningYears.reduce((sum, y) => sum + getPTOBalanceForYear(y, new Date(), undefined, selectedDates).available, 0);
  const goToTab = (tab: 'planner' | 'plans' | 'settings') => {
    if (tab === 'planner' && selectedPlan) {
      setSelectedPlan(null);
      setSelectedDates([]);
      setCalendarFocusDates([]);
      setShowConfig(true);
    }
    setActiveTab(tab);
  };
  const workSettings = <>
    {allHolidays.some(holiday => holiday.counties?.length) && <RegionSelectorDropdown
      holidays={allHolidays} selectedRegions={planningConfig.selectedRegions || []}
      onChange={regions => handleConfigChange({ ...planningConfig, selectedRegions: regions })} />}
    <fieldset className="workweek-settings">
      <legend>Days you normally work</legend>
      <div className="workweek-options">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}>
        <input type="checkbox" checked={workDays.includes(index)} onChange={event => {
          const next = event.target.checked ? [...workDays, index].sort() : workDays.filter(d => d !== index);
          if (next.length > 0 && next.length < 7) handleConfigChange({ ...planningConfig, workDays: next });
        }} />{day}</label>)}</div>
      <p>Keep at least one working day and one rest day.</p>
    </fieldset>
    <HolidayApplicability config={planningConfig} onChange={handleConfigChange} holidays={allHolidays} countryCode={countryCode} />
  </>;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <div className="header-content">
          <h1>StretchBreak</h1>
          <p className="subtitle">More time off. Fewer PTO days.</p>
        </div>
      </header>
      <nav className="app-tabs" role="tablist" aria-label="Main">
        {([
          { id: 'planner' as const, label: 'Plan a break' },
          { id: 'plans' as const, label: 'My breaks' },
          { id: 'settings' as const, label: 'Settings' },
        ]).map((tab, index, tabs) => <button key={tab.id} type="button" role="tab" id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id} aria-controls="main-content" tabIndex={activeTab === tab.id ? 0 : -1}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => goToTab(tab.id)}
          onKeyDown={event => {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            goToTab(tabs[next].id);
            requestAnimationFrame(() => document.getElementById(`tab-${tabs[next].id}`)?.focus());
          }}>{tab.label}</button>)}
      </nav>
      <main id="main-content" className="app-main" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'planner' && <div className="planner-view" ref={plannerViewRef}>
          <ol className="planning-progress" aria-label="Planning progress">
            {['Set up', 'Choose a break', 'Save'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={step === index ? 'current' : step > index ? 'complete' : ''}><span>{index + 1}</span>{label}</li>)}
          </ol>
          {showConfig ? <PlanningConfigPanel
            config={planningConfig} holidays={allHolidays} countryCode={countryCode}
            onConfigChange={handleConfigChange} onOptimize={handleOptimize}
            suggestions={suggestions} onApplySuggestion={applySuggestionToPlan}
            locationFields={<CountrySelector value={countryCode} onChange={handleCountryChange} />}
            advancedFields={workSettings} isLoading={holidaysLoading} disabled={!!holidaysError || !countryCode}
            actionHint={!countryCode ? 'Choose a country to find breaks.' : holidaysError ? 'Could not load holidays. Try again or choose another country.' : undefined}
          /> : <>
            <div className="planning-context">
              <p>{countryName} · {year} · {availablePTO} PTO days available</p>
              <button type="button" className="ghost-button" onClick={() => setShowConfig(true)}>Edit setup</button>
            </div>
            {holidaysLoading && <p className="loading-message" role="status">Loading holidays…</p>}
            {holidaysError && <p className="error-message" role="alert">We couldn’t load holidays. Edit your setup or try again.</p>}
            {selectedDates.length > 0 && <section className="save-plan-section" aria-labelledby="review-heading">
              <p className="section-eyebrow">Your break</p>
              <h2 id="review-heading" tabIndex={-1}>Ready to save?</h2>
              <div className="break-review-dates">{currentBreaks.map(period => <p key={period.startDate}>{formatDateDisplay(period.startDate)} – {formatDateDisplay(period.endDate)}</p>)}</div>
              <p className="break-review-total">Use <strong>{currentBreaks.reduce((sum, period) => sum + period.leaveDates.length, 0)} PTO day{selectedDates.length === 1 ? '' : 's'}</strong> → get <strong>{currentBreaks.reduce((sum, period) => sum + period.totalDaysOff, 0)} days off</strong></p>
              <p className="save-plan-hint">{remainingPTO} PTO days left after this selection. Confirm time off with your employer.</p>
              <form className="save-plan-form" onSubmit={event => {
                event.preventDefault();
                const name = planName.trim() || `Break · ${formatDateDisplay(currentBreaks[0]?.startDate || selectedDates[0])}`;
                if (!handleSavePlan(name, planDescription.trim() || undefined)) return;
                setPlanName(''); setPlanDescription(''); setActiveTab('plans');
                requestAnimationFrame(() => document.getElementById('saved-break-heading')?.focus());
              }}>
                <label>Break name (optional)<input type="text" value={planName} onChange={event => setPlanName(event.target.value)} placeholder="My next break" /></label>
                <details className="simple-disclosure"><summary>Add a note</summary><label>Notes<textarea value={planDescription} onChange={event => setPlanDescription(event.target.value)} rows={2} /></label></details>
                <button type="submit" className="save-button">Save break</button>
                <p className="save-local-note">Saved on this device. Calendar export is available next.</p>
              </form>
            </section>}
            <HolidayPlanner holidays={holidays} companyHolidays={planningConfig.companyHolidays} workDays={workDays}
              year={year} holidaysLoading={holidaysLoading} suggestions={suggestions} selectedDates={selectedDates}
              focusOnDates={calendarFocusDates} onDateChange={setSelectedDates} strategy={planningConfig.strategy}
              availablePTODays={availablePTO} usedStrategies={[]}
              onStrategyChange={strategy => setPlanningConfig(prev => ({ ...prev, strategy }))}
              onApplyStrategy={previewStrategy}
              extraOptions={<>
              <NaturalLanguageInput holidays={holidays} year={year} suggestions={suggestions} onApplySuggestion={applySuggestionToPlan} />
              {isAIAvailable && <div className="ai-request">
                <AIAccessPanel onReady={refreshAvailability} />
                <p>Ask AI to rank breaks using your holiday settings. Available for one calendar year at a time.</p>
                <button type="button" className="ghost-button" disabled={aiLoading || holidaysLoading || !!holidaysError || planningYears.length !== 1} onClick={() => {
                  setAIContextKey(contextKey);
                  generateSuggestions(holidays, year, preferences, { countryCode, selectedRegions: planningConfig.selectedRegions, excludedHolidayDates: planningConfig.excludedHolidayDates, availablePTODays: availablePTO, workDays, companyHolidays: planningConfig.companyHolidays, startDate: formatDate(rangeStart), endDate: formatDate(rangeEnd) });
                }}>{aiLoading ? 'Finding breaks…' : 'Ask AI for suggestions'}</button>
                {aiError && <p role="alert">{aiError}</p>}
              </div>}
              </>} />

          </>}
          <HolidayDataNotice metadataByYear={metadataByYear} holidays={allHolidays} selectedRegions={planningConfig.selectedRegions} />
        </div>}

        {activeTab === 'plans' && (selectedPlan ? <div className="saved-break-view">
          <button type="button" className="back-button" onClick={() => { setSelectedPlan(null); setSelectedDates([]); }}>← My breaks</button>
          <section className="saved-break-summary">
            <p className="section-eyebrow">Saved on this device</p>
            <h2 id="saved-break-heading" tabIndex={-1}>{selectedPlan.name}</h2>
            {savedBreaks.map(period => <p key={period.startDate}>{formatDateDisplay(period.startDate)} – {formatDateDisplay(period.endDate)}</p>)}
            <p className="break-review-total"><strong>{selectedPlan.vacationDays.length} PTO day{selectedPlan.vacationDays.length === 1 ? '' : 's'}</strong> · <strong>{savedBreaks.reduce((sum, period) => sum + period.totalDaysOff, 0)} days off</strong></p>
            {selectedPlan.description && <p>{selectedPlan.description}</p>}
          </section>
          <ExportPanel plan={selectedPlan} aiAvailable={isAIAvailable} />
          <details className="simple-disclosure"><summary>View calendar and day-by-day details</summary>
            <PlanBreakdown plan={selectedPlan} holidays={selectedPlan.publicHolidays} />
            <Calendar selectedDates={selectedPlan.vacationDays} suggestedDates={[]} holidays={selectedPlan.publicHolidays}
              companyHolidays={selectedPlan.companyHolidays} workDays={selectedPlan.workDays} readOnly onDateClick={() => {}}
              year={selectedPlan.year} focusOnDates={selectedPlan.vacationDays} />
          </details>
          <details className="simple-disclosure"><summary>More tools: budget, sharing and versions</summary>
            {savedBreaks.map((period, index) => <BudgetCalculator showSavedBudgets={index === 0} key={`${selectedPlan.id}-${period.startDate}`} planId={selectedPlan.id} startDate={period.startDate} endDate={period.endDate} periodLabel={`${selectedPlan.name} · Break ${index + 1}`} />)}
            <StretchShare vacationDays={selectedPlan.vacationDays} holidays={savedHolidays} workDays={selectedPlan.workDays} countryCode={selectedPlan.countryCode} year={selectedPlan.year} />
            <PublicCalendarToggle plan={selectedPlan} />
            <PlanVersions plan={selectedPlan} onPlanUpdated={loadPlans} />
          </details>
        </div> : <>
          <div className="breaks-page-header"><h2>My breaks</h2><button type="button" className="save-button" onClick={() => { setShowConfig(true); setSelectedDates([]); goToTab('planner'); }}>Plan a break</button></div>
          <PlanList plans={plans} onUpdatePlan={updatePlan} onDeletePlan={deletePlan} onSelectPlan={viewPlan}
            currentVacationDays={selectedDates} currentHolidays={holidays} currentCountryCode={countryCode} currentYear={year} />
          <details className="simple-disclosure" onToggle={event => setShowMultiYearView(event.currentTarget.open)}><summary>Multi-year overview</summary>
            {showMultiYearView && <MultiYearOverview onSelectPlan={plan => { viewPlan(plan); setShowMultiYearView(false); }} />}
          </details>
        </>)}

        {activeTab === 'settings' && <div className="settings-and-tools">
          <SettingsTab onResetAll={handleResetAll} themeMode={themeMode} onThemeChange={setThemeMode}
            contrast={contrast} onContrastChange={setContrast} fontScale={fontScale} onFontScaleChange={setFontScale} countryCode={countryCode} />
          <h2>Extra tools</h2>
          <details className="simple-disclosure"><summary>Leave analytics</summary><VacationAnalytics plans={plans}
            totalAvailablePTO={[...new Set(plans.map(plan => plan.year))].reduce((sum, planYear) => sum + getPTOBalanceForYear(planYear).annualTotal, 0)} countryCode={countryCode} year={year} holidays={holidays} /></details>
          <details className="simple-disclosure"><summary>Team planning and wishlist</summary>
            <TeamPanel selectedDates={selectedDates} selectedPlan={selectedPlan} holidays={holidays} />
            <WishlistPanel suggestions={suggestions} onApplySuggestion={applySuggestionToPlan} />
          </details>
          {isAIAvailable && <details className="simple-disclosure"><summary>AI assistant</summary>
            <AIAccessPanel onReady={refreshAvailability} /><ChatAssistant key={contextKey} startDate={rangeStartKey} endDate={rangeEndKey}
              holidays={holidays} year={year} countryCode={countryCode} currentPlan={selectedDates.length ? { vacationDays: selectedDates } : undefined}
              preferences={preferences} selectedRegions={planningConfig.selectedRegions} excludedHolidayDates={planningConfig.excludedHolidayDates}
              availablePTODays={availablePTO} workDays={workDays} companyHolidays={planningConfig.companyHolidays} />
          </details>}
        </div>}
      </main>
      <OfflineIndicator />
    </div>
  );
}

export default App;
