import { useState, useEffect, useRef, useMemo } from 'react';
import { HolidayPlanner } from './components/HolidayPlanner/HolidayPlanner';
import { Calendar } from './components/Calendar/Calendar';
import { StatsPanel } from './components/Statistics/StatsPanel';
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
import { useLocation } from './hooks/useLocation';
import { useTheme } from './hooks/useTheme';
import { useAccessibility } from './hooks/useAccessibility';
import { createPlanId, getAllPlans, clearAllPlans, getUsedStrategies } from './services/planStorage';
import { getSharedPlanFromUrl, getSharedTemplateFromUrl } from './services/shareService';
import { saveTemplate } from './services/templateStorage';
import { setTotalPTODays, getTotalPTODays, getRemainingPTODays, hasSavedPlansWithPTO, resetAllPTOData, getAvailablePTODaysInput, getCarryover, getEffectiveAvailablePTODays, isCarryoverUsable } from './services/ptoTracking';
import { SettingsTab } from './components/Settings/SettingsTab';
import { BridgeBoard } from './components/BridgeBoard/BridgeBoard';
import { NaturalLanguageInput } from './components/NaturalLanguage/NaturalLanguageInput';
import { StretchShare } from './components/Share/StretchShare';
import { BudgetCalculator } from './components/Budget/BudgetCalculator';
import { optimizeByStrategy } from './utils/strategyOptimizer';
import { filterHolidaysByRegions } from './utils/holidayFilter';
import { parseDateString, formatDate } from './utils/dateUtils';
import { checkRemindersOnLoad } from './services/reminderService';
import { startOfYear, endOfYear, isPast, parseISO, startOfDay, isSameDay, eachDayOfInterval } from 'date-fns';
import type { HolidayPlan, PlanningConfig, PlanSuggestion, VacationStrategy } from './utils/types';
import './App.css';

function App() {
  const [countryCode, setCountryCode] = useState(() => {
    const saved = localStorage.getItem('lastCountryCode');
    return saved || 'NL';
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<HolidayPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'plans' | 'insights' | 'chat' | 'settings' | 'team'>('planner');
  const [shouldApplyAutoDetect, setShouldApplyAutoDetect] = useState(false);
  const [showMultiYearView, setShowMultiYearView] = useState(false);
  const plannerViewRef = useRef<HTMLDivElement>(null);
  
  // Initialize PTO from saved plans or localStorage
  const initializePTO = () => {
    const savedTotal = getTotalPTODays();
    if (savedTotal > 0) {
      return getRemainingPTODays();
    }
    const savedPlans = getAllPlans();
    const planWithPTO = savedPlans.find(p => p.availablePTODays && p.availablePTODays > 0);
    if (planWithPTO && planWithPTO.availablePTODays) {
      setTotalPTODays(planWithPTO.availablePTODays);
      return getRemainingPTODays();
    }
    return 0;
  };
  
  const [planningConfig, setPlanningConfig] = useState<PlanningConfig>(() => {
    const initialPTO = initializePTO();
    const persistedInput = getAvailablePTODaysInput();
    const carryover = getCarryover();
    const effectivePTO = getEffectiveAvailablePTODays();
    
    return {
      availablePTODays: persistedInput > 0 ? persistedInput : (effectivePTO > 0 ? effectivePTO : initialPTO),
      timeframe: {
        type: 'calendar-year',
        year: new Date().getFullYear(),
      },
      companyHolidays: [],
      selectedRegions: [],
      carryover: carryover.days > 0 && carryover.expiryMonth > 0 ? carryover : undefined,
    };
  });
  
  const year = planningConfig.timeframe.type === 'calendar-year' 
    ? (planningConfig.timeframe.year || new Date().getFullYear())
    : planningConfig.timeframe.startDate 
      ? new Date(planningConfig.timeframe.startDate).getFullYear()
      : new Date().getFullYear();

  const planningYears = useMemo(() => {
    if (
      planningConfig.timeframe.type === 'custom' &&
      planningConfig.timeframe.startDate &&
      planningConfig.timeframe.endDate
    ) {
      const startY = new Date(planningConfig.timeframe.startDate).getFullYear();
      const endY = new Date(planningConfig.timeframe.endDate).getFullYear();
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

  const [optimizedSuggestions, setOptimizedSuggestions] = useState<any[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [showConfig, setShowConfig] = useState(() => {
    // Don't show config if there are saved plans with PTO
    return !hasSavedPlansWithPTO();
  });
  
  // Clear optimized suggestions when year or country changes to prevent stale data
  useEffect(() => {
    setOptimizedSuggestions([]);
  }, [year, countryCode]);
  
  const { holidaysByYear, loading: holidaysLoading, error: holidaysError } = useMultiYearHolidays(planningYears, countryCode);
  const allHolidays = useMemo(
    () => Array.from(holidaysByYear.values()).flat(),
    [holidaysByYear]
  );
  
  const holidays = planningConfig.selectedRegions && planningConfig.selectedRegions.length > 0
    ? filterHolidaysByRegions(allHolidays, planningConfig.selectedRegions)
    : allHolidays;
  
  const { addPlan, updatePlan, deletePlan, plans, loadPlans } = usePlans();
  const { aiSuggestions, loading: aiLoading, error: aiError, generateSuggestions, isAIAvailable, aiChecked } = useAI();
  const { preferences, updateFromPlan } = usePreferences();
  const { detectedCountry, isDetecting, detectLocation } = useLocation();
  const { themeMode, setThemeMode } = useTheme();
  const { contrast, setContrast, fontScale, setFontScale } = useAccessibility();
  
  useEffect(() => {
    // Country detection is opt-in (toolbar button) — do not phone home on load.
    checkRemindersOnLoad();
  }, []);
  
  // Update remaining PTO when plans change
  useEffect(() => {
    if (getTotalPTODays() > 0) {
      const remaining = getEffectiveAvailablePTODays(new Date(), year);
      setPlanningConfig(prev => ({
        ...prev,
        availablePTODays: remaining,
      }));
    }
  }, [plans, year]);

  useEffect(() => {
    if (holidays.length > 0 && !holidaysLoading && aiChecked && isAIAvailable) {
      generateSuggestions(holidays, year, preferences);
    }
  }, [holidays.length, holidaysLoading, year, isAIAvailable, aiChecked, generateSuggestions]);
  
  useEffect(() => {
    localStorage.setItem('lastCountryCode', countryCode);
  }, [countryCode]);
  
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPlan(newPlan);
    setSelectedPlan(newPlan);
  }, [addPlan]);

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
    setActiveTab('planner');
  }, []);
  
  useEffect(() => {
    if (detectedCountry && shouldApplyAutoDetect) {
      setCountryCode(detectedCountry);
      setShouldApplyAutoDetect(false);
    }
  }, [detectedCountry, shouldApplyAutoDetect]);
  
  const handleCountryChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    setShouldApplyAutoDetect(false);
  };

  const applySuggestionToPlan = (suggestion: PlanSuggestion) => {
    const start = parseDateString(suggestion.startDate);
    const end = parseDateString(suggestion.endDate);
    const dates: string[] = [];

    for (const day of eachDayOfInterval({ start, end })) {
      const dateStr = formatDate(day);
      const isPublicHoliday = holidays.some(h => h.date === dateStr);
      const isCompanyHoliday = planningConfig.companyHolidays.some(h => h.date === dateStr);
      const dayOfWeek = day.getDay();
      if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(dateStr);
      }
    }

    setSelectedDates([...new Set(dates)].sort());
    setShowConfig(false);
    setActiveTab('planner');
    window.setTimeout(() => {
      plannerViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
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
      setShowConfig(false);
    }
  }, [selectedPlan]);
  
  const handleSavePlan = (planName: string, description?: string) => {
    if (selectedDates.length === 0) {
      alert('Please select some vacation days first');
      return;
    }
    
    // Save total PTO if not already saved
    const totalPTO = getTotalPTODays();
    if (planningConfig.availablePTODays > 0 && totalPTO === 0) {
      setTotalPTODays(planningConfig.availablePTODays);
    }
    
    const plan: HolidayPlan = {
      id: createPlanId(),
      name: planName,
      description,
      countryCode,
      year,
      vacationDays: selectedDates,
      publicHolidays: holidays,
      companyHolidays: planningConfig.companyHolidays,
      strategy: planningConfig.strategy,
      availablePTODays: totalPTO > 0 ? totalPTO : planningConfig.availablePTODays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    addPlan(plan);
    updateFromPlan(plan);
    
    // Update remaining PTO
    const remaining = getEffectiveAvailablePTODays(new Date(), year);
    setPlanningConfig(prev => ({
      ...prev,
      availablePTODays: remaining,
    }));
    
    alert('Plan saved successfully!');
  };

  const applyStrategyAndSave = (strategyToApply: VacationStrategy) => {
    // Use remaining PTO if available, otherwise use configured PTO
    const availablePTO = getTotalPTODays() > 0 ? getEffectiveAvailablePTODays(new Date(), year) : planningConfig.availablePTODays;
    
    // Get already used dates from saved plans to avoid overlap
    const existingPlans = getAllPlans();
    const usedDates = new Set<string>();
    existingPlans.forEach(plan => {
      plan.vacationDays.forEach(day => {
        if (day && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
          usedDates.add(day.trim());
        }
      });
    });
    
    if (availablePTO === 0) {
      alert('No remaining PTO days available. Please add more PTO days or remove existing plans.');
      return;
    }
    
    if (holidays.length === 0) {
      alert('Please wait for holidays to load, or select a country and year');
      return;
    }
    
    let startDate: Date;
    let endDate: Date;
    
    if (planningConfig.timeframe.type === 'calendar-year') {
      const configYear = planningConfig.timeframe.year || new Date().getFullYear();
      startDate = startOfYear(new Date(configYear, 0, 1));
      endDate = endOfYear(new Date(configYear, 0, 1));
    } else {
      startDate = planningConfig.timeframe.startDate
        ? parseDateString(planningConfig.timeframe.startDate)
        : new Date();
      endDate = planningConfig.timeframe.endDate
        ? parseDateString(planningConfig.timeframe.endDate)
        : new Date();
    }
    
    // Filter out past holidays before generating suggestions
    const today = startOfDay(new Date());
    const futureHolidays = holidays.filter(holiday => {
      const holidayDate = startOfDay(parseISO(holiday.date));
      return !isPast(holidayDate) || isSameDay(holidayDate, today);
    });
    
    // Save total PTO if not already saved
    if (planningConfig.availablePTODays > 0 && getTotalPTODays() === 0) {
      setTotalPTODays(planningConfig.availablePTODays);
    }
    
    const suggestions = optimizeByStrategy({
      holidays: futureHolidays,
      companyHolidays: planningConfig.companyHolidays,
      availablePTODays: availablePTO,
      strategy: strategyToApply,
      startDate,
      endDate,
      carryover: planningConfig.carryover &&
        planningConfig.carryover.days > 0 &&
        isCarryoverUsable(planningConfig.carryover.expiryMonth, new Date(), year)
        ? {
            days: planningConfig.carryover.days,
            expiryMonth: planningConfig.carryover.expiryMonth,
            year,
          }
        : undefined,
    });
    
    setOptimizedSuggestions(suggestions);
    setShowConfig(false);
    
    // Auto-apply and save the top suggestion
    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      const start = parseDateString(topSuggestion.startDate);
      const end = parseDateString(topSuggestion.endDate);
      const dates: string[] = [];
      
      const allDays = eachDayOfInterval({ start, end });
      
      for (const day of allDays) {
        const dateStr = formatDate(day);
        const isPublicHoliday = futureHolidays.some(h => h.date === dateStr);
        const isCompanyHoliday = planningConfig.companyHolidays.some(h => h.date === dateStr);
        const dayOfWeek = day.getDay();
        const isAlreadyUsed = usedDates.has(dateStr);
        
        if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6 && !isAlreadyUsed) {
          dates.push(dateStr);
        }
      }
      
      const sortedDates = [...new Set(dates)].sort();
      
      if (sortedDates.length > 0) {
        setSelectedDates(sortedDates);
        
        // Auto-save the plan
        const strategyLabels: Record<string, string> = {
          'balanced': 'Flexible Approach',
          'long-weekends': 'Weekend Focus',
          'mini-breaks': 'Short Getaways',
          'week-long': 'Full Week Vacations',
          'extended': 'Deep Breaks',
        };
        const planName = strategyLabels[strategyToApply] || strategyToApply;
        
        // Save total PTO if not already saved
        const totalPTO = getTotalPTODays();
        if (planningConfig.availablePTODays > 0 && totalPTO === 0) {
          setTotalPTODays(planningConfig.availablePTODays);
        }
        
        const plan: HolidayPlan = {
          id: createPlanId(),
          name: planName,
          description: `Auto-saved from ${planName} strategy`,
          countryCode,
          year,
          vacationDays: sortedDates,
          publicHolidays: holidays,
          companyHolidays: planningConfig.companyHolidays,
          strategy: strategyToApply as any,
          availablePTODays: totalPTO > 0 ? totalPTO : planningConfig.availablePTODays,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        addPlan(plan);
        
        // Update remaining PTO
        const remaining = getEffectiveAvailablePTODays(new Date(), year);
        setPlanningConfig(prev => ({
          ...prev,
          availablePTODays: remaining,
          strategy: strategyToApply as any,
        }));
      }
    }
    
    setTimeout(() => {
      plannerViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOptimize = () => {
    // Use remaining PTO if available, otherwise use configured PTO
    const availablePTO = getTotalPTODays() > 0 ? getEffectiveAvailablePTODays(new Date(), year) : planningConfig.availablePTODays;
    
    if (availablePTO === 0) {
      alert('No remaining PTO days available. Please add more PTO days or remove existing plans.');
      return;
    }
    
    if (holidays.length === 0) {
      alert('Please wait for holidays to load, or select a country and year');
      return;
    }
    
    let startDate: Date;
    let endDate: Date;
    
    if (planningConfig.timeframe.type === 'calendar-year') {
      const configYear = planningConfig.timeframe.year || new Date().getFullYear();
      startDate = startOfYear(new Date(configYear, 0, 1));
      endDate = endOfYear(new Date(configYear, 0, 1));
    } else {
      startDate = planningConfig.timeframe.startDate
        ? parseDateString(planningConfig.timeframe.startDate)
        : new Date();
      endDate = planningConfig.timeframe.endDate
        ? parseDateString(planningConfig.timeframe.endDate)
        : new Date();
    }
    
    // Filter out past holidays before generating suggestions
    const today = startOfDay(new Date());
    const futureHolidays = holidays.filter(holiday => {
      const holidayDate = startOfDay(parseISO(holiday.date));
      return !isPast(holidayDate) || isSameDay(holidayDate, today);
    });
    
    // Save total PTO if not already saved
    if (planningConfig.availablePTODays > 0 && getTotalPTODays() === 0) {
      setTotalPTODays(planningConfig.availablePTODays);
    }
    
    const suggestions = optimizeByStrategy({
      holidays: futureHolidays,
      companyHolidays: planningConfig.companyHolidays,
      availablePTODays: availablePTO,
      strategy: planningConfig.strategy || 'balanced',
      startDate,
      endDate,
      carryover: planningConfig.carryover &&
        planningConfig.carryover.days > 0 &&
        isCarryoverUsable(planningConfig.carryover.expiryMonth, new Date(), year)
        ? {
            days: planningConfig.carryover.days,
            expiryMonth: planningConfig.carryover.expiryMonth,
            year,
          }
        : undefined,
    });
    
    setOptimizedSuggestions(suggestions);
    setShowConfig(false);
    
    // Auto-apply and save the top suggestion if strategy is selected
    if (planningConfig.strategy && suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      const start = parseDateString(topSuggestion.startDate);
      const end = parseDateString(topSuggestion.endDate);
      const dates: string[] = [];
      
      const allDays = eachDayOfInterval({ start, end });
      
      for (const day of allDays) {
        const dateStr = formatDate(day);
        const isPublicHoliday = futureHolidays.some(h => h.date === dateStr);
        const isCompanyHoliday = planningConfig.companyHolidays.some(h => h.date === dateStr);
        const dayOfWeek = day.getDay();
        
        if (!isPublicHoliday && !isCompanyHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(dateStr);
        }
      }
      
      const sortedDates = [...new Set(dates)].sort();
      
      if (sortedDates.length > 0) {
        setSelectedDates(sortedDates);
        
        // Auto-save the plan
        const strategyLabels: Record<string, string> = {
          'balanced': 'Flexible Approach',
          'long-weekends': 'Weekend Focus',
          'mini-breaks': 'Short Getaways',
          'week-long': 'Full Week Vacations',
          'extended': 'Deep Breaks',
        };
        const planName = strategyLabels[planningConfig.strategy] || planningConfig.strategy;
        
        // Save total PTO if not already saved
        const totalPTO = getTotalPTODays();
        if (planningConfig.availablePTODays > 0 && totalPTO === 0) {
          setTotalPTODays(planningConfig.availablePTODays);
        }
        
        const plan: HolidayPlan = {
          id: createPlanId(),
          name: planName,
          description: `Auto-saved from ${planName} strategy`,
          countryCode,
          year,
          vacationDays: sortedDates,
          publicHolidays: holidays,
          companyHolidays: planningConfig.companyHolidays,
          strategy: planningConfig.strategy,
          availablePTODays: totalPTO > 0 ? totalPTO : planningConfig.availablePTODays,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        addPlan(plan);
        
        // Update remaining PTO
        const remaining = getEffectiveAvailablePTODays(new Date(), year);
        setPlanningConfig(prev => ({
          ...prev,
          availablePTODays: remaining,
        }));
      }
    }
    
    setTimeout(() => {
      plannerViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset everything? This will:\n\n- Delete all saved plans\n- Clear all PTO tracking\n- Reset to a fresh start\n\nThis action cannot be undone.')) {
      clearAllPlans();
      resetAllPTOData();
      
      // Reset state
      setSelectedDates([]);
      setSelectedPlan(null);
      setOptimizedSuggestions([]);
      setPlanningConfig({
        availablePTODays: 0,
        timeframe: {
          type: 'calendar-year',
          year: new Date().getFullYear(),
        },
        companyHolidays: [],
        selectedRegions: [],
      });
      setShowConfig(true);
      setActiveTab('planner');
      
      // Reload plans
      loadPlans();
      
      alert('All data has been reset. You can start fresh!');
    }
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="header-content">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-dot" />
            <span className="brand-label">Vacation planner</span>
          </div>
          <h1>StretchBreak</h1>
          <p className="subtitle">
            Turn public holidays into longer escapes — plan PTO around the calendar that actually works.
          </p>
        </div>
      </header>

      <div className="app-toolbar">
        <div className="app-controls">
          <div className="location-control">
            <CountrySelector value={countryCode} onChange={handleCountryChange} />
            <button
              onClick={async () => {
                const ok = window.confirm(
                  'Detect country from your IP address?\n\n' +
                    'Your IP will be sent to a third-party lookup service (ipapi / ip-api / similar). ' +
                    'Cancel to keep your saved or manually selected country.'
                );
                if (!ok) return;
                setShouldApplyAutoDetect(true);
                await detectLocation({ allowGeolocation: false });
              }}
              disabled={isDetecting}
              className="refresh-location-button"
              title="Opt-in: detect country via IP (third-party lookup)"
              aria-label="Detect country from IP address"
            >
              {isDetecting ? '…' : '↻'}
            </button>
            {detectedCountry && countryCode === detectedCountry && (
              <span className="location-success" title="Country auto-detected">
                Detected
              </span>
            )}
          </div>
          <div className="year-region-controls">
            {!holidaysLoading && allHolidays.length > 0 && (
              <RegionSelectorDropdown
                holidays={allHolidays}
                selectedRegions={planningConfig.selectedRegions || []}
                onChange={(regions) => setPlanningConfig({ ...planningConfig, selectedRegions: regions })}
              />
            )}
          </div>
        </div>
      </div>

      <nav className="app-tabs" role="tablist" aria-label="Main">
        {(
          [
            { id: 'planner' as const, label: 'Planner' },
            { id: 'plans' as const, label: 'Saved Plans' },
            { id: 'insights' as const, label: 'Analytics' },
            { id: 'team' as const, label: 'Team' },
            ...(isAIAvailable ? [{ id: 'chat' as const, label: 'AI Assistant' }] : []),
            { id: 'settings' as const, label: 'Settings' },
          ]
        ).map((tab, index, tabs) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls="main-content"
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
                return;
              }
              e.preventDefault();
              let next = index;
              if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
              if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
              if (e.key === 'Home') next = 0;
              if (e.key === 'End') next = tabs.length - 1;
              setActiveTab(tabs[next].id);
              requestAnimationFrame(() => {
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              });
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      
      <main id="main-content" className="app-main" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'planner' && (
          <div className="planner-view" ref={plannerViewRef}>
            {showConfig ? (
              <>
                <PlanningConfigPanel
                  config={planningConfig}
                  holidays={allHolidays}
                  countryCode={countryCode}
                  onConfigChange={setPlanningConfig}
                  onOptimize={handleOptimize}
                  suggestions={optimizedSuggestions.length > 0 ? optimizedSuggestions : aiSuggestions}
                  onApplySuggestion={applySuggestionToPlan}
                />

                <BridgeBoard
                  holidays={holidays.filter(holiday => {
                    const today = startOfDay(new Date());
                    const holidayDate = startOfDay(parseISO(holiday.date));
                    return holidayDate.getFullYear() === year &&
                      (!isPast(holidayDate) || isSameDay(holidayDate, today));
                  })}
                  year={year}
                  countryCode={countryCode}
                  loading={holidaysLoading}
                  onUseBridge={applySuggestionToPlan}
                />
                
                {holidaysLoading && (
                  <div className="loading-message">Loading holidays...</div>
                )}
                
                {holidaysError && (
                  <div className="error-message">
                    Error loading holidays: {holidaysError}
                  </div>
                )}
              </>
            ) : (
              // Normal planning mode - show suggestions and input
              <>
                <div className="config-header">
                  <button
                    onClick={() => setShowConfig(true)}
                    className="back-button"
                  >
                    ← Back to Configuration
                  </button>
                </div>
                
                {aiLoading && (
                  <div className="loading-message">
                    AI is analyzing holidays and generating suggestions…
                  </div>
                )}
                
                {aiError && (
                  <div className="error-message">
                    AI error: {aiError}
                  </div>
                )}

                {aiChecked && !isAIAvailable && !aiError && (
                  <div className="info-message">
                    AI extras are offline — Bridge Board and natural-language planning still work.
                    For chat/AI suggestions, run <code>npm run dev:full</code> with an OpenAI key.
                  </div>
                )}

                <NaturalLanguageInput
                  holidays={holidays.filter(holiday => {
                    const today = startOfDay(new Date());
                    const holidayDate = startOfDay(parseISO(holiday.date));
                    return holidayDate.getFullYear() === year &&
                      (!isPast(holidayDate) || isSameDay(holidayDate, today));
                  })}
                  year={year}
                  onApplySuggestion={applySuggestionToPlan}
                />
                
                <HolidayPlanner
                  holidays={holidays.filter(holiday => {
                    const today = startOfDay(new Date());
                    const holidayDate = startOfDay(parseISO(holiday.date));
                    // Filter by year first, then by past dates
                    const holidayYear = holidayDate.getFullYear();
                    const isInYear = holidayYear === year;
                    const isFutureOrToday = !isPast(holidayDate) || isSameDay(holidayDate, today);
                    return isInYear && isFutureOrToday;
                  })}
                  companyHolidays={planningConfig.companyHolidays}
                  year={year}
                  holidaysLoading={holidaysLoading}
                  suggestions={optimizedSuggestions.length > 0 ? optimizedSuggestions : aiSuggestions}
                  selectedDates={selectedDates}
                  onDateChange={setSelectedDates}
                  strategy={planningConfig.strategy}
                  availablePTODays={planningConfig.availablePTODays}
                  usedStrategies={getUsedStrategies()}
                  onStrategyChange={(strategy) => {
                    setPlanningConfig(prev => ({ ...prev, strategy }));
                  }}
                  onApplyStrategy={(strategy: VacationStrategy) => {
                    applyStrategyAndSave(strategy);
                  }}
                  onAutoSave={(planData) => {
                    // Save total PTO if not already saved
                    const totalPTO = getTotalPTODays();
                    const planPTO = planData.availablePTODays || 0;
                    if (planPTO > 0 && totalPTO === 0) {
                      setTotalPTODays(planPTO);
                    }
                    
                    const plan: HolidayPlan = {
                      id: createPlanId(),
                      name: planData.name,
                      description: `Auto-saved from ${planData.name} strategy`,
                      countryCode,
                      year,
                      vacationDays: planData.vacationDays,
                      publicHolidays: holidays,
                      companyHolidays: planningConfig.companyHolidays,
                      strategy: planData.strategy as any,
                      availablePTODays: totalPTO > 0 ? totalPTO : planPTO,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    addPlan(plan);
                    
                    // Update remaining PTO
                    const remaining = getEffectiveAvailablePTODays(new Date(), year);
                    setPlanningConfig(prev => ({
                      ...prev,
                      availablePTODays: remaining,
                    }));
                  }}
                />
                
                <StatsPanel
                  vacationDays={selectedDates}
                  holidays={holidays}
                  availablePTODays={planningConfig.availablePTODays}
                  onViewInsights={() => setActiveTab('insights')}
                />

                {selectedDates.length > 0 && (() => {
                  const sortedDates = [...selectedDates].sort();
                  return (
                    <BudgetCalculator
                      startDate={sortedDates[0]}
                      endDate={sortedDates[sortedDates.length - 1]}
                      periodLabel="Current Plan"
                    />
                  );
                })()}

                <StretchShare
                  vacationDays={selectedDates}
                  holidays={holidays}
                  countryCode={countryCode}
                  year={year}
                />
                
                {selectedDates.length > 0 && (
                  <ExportPanel
                    plan={{
                      id: 'current',
                      name: 'Current Plan',
                      countryCode,
                      year,
                      vacationDays: selectedDates,
                      publicHolidays: holidays,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    }}
                    currentSelectedDates={selectedDates}
                  />
                )}
                
                <div className="save-plan-section">
                  <h3>Save your plan</h3>
                  <p className="save-plan-hint">
                    {selectedDates.length === 0
                      ? 'Select vacation days on the calendar first.'
                      : `${selectedDates.length} day${selectedDates.length === 1 ? '' : 's'} selected — name it and keep it.`}
                  </p>
                  {!showSaveForm ? (
                    <button
                      type="button"
                      onClick={() => setShowSaveForm(true)}
                      className="save-button"
                      disabled={selectedDates.length === 0}
                    >
                      Save plan
                    </button>
                  ) : (
                    <form
                      className="save-plan-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const name = planName.trim();
                        if (!name) return;
                        handleSavePlan(name, planDescription.trim() || undefined);
                        setPlanName('');
                        setPlanDescription('');
                        setShowSaveForm(false);
                        setActiveTab('plans');
                      }}
                    >
                      <label>
                        Plan name
                        <input
                          type="text"
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder="Summer long weekend"
                          autoFocus
                          required
                        />
                      </label>
                      <label>
                        Description (optional)
                        <textarea
                          value={planDescription}
                          onChange={(e) => setPlanDescription(e.target.value)}
                          placeholder="Notes for later…"
                          rows={2}
                        />
                      </label>
                      <div className="save-plan-actions">
                        <button type="submit" className="save-button" disabled={!planName.trim()}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => {
                            setShowSaveForm(false);
                            setPlanName('');
                            setPlanDescription('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
            
            {!holidaysLoading && !holidaysError && holidays.length === 0 && !showConfig && (
              <div className="empty-state">
                <p>Select a country and year to see public holidays and start planning!</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'plans' && (
          selectedPlan ? (
            // View mode for saved plan - show only breakdown and calendar
            <>
              <div className="config-header">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="back-button"
                >
                  ← Back to Saved Plans
                </button>
              </div>
              
              <PlanVersions
                plan={selectedPlan}
                onPlanUpdated={loadPlans}
              />
              
              <PlanBreakdown
                plan={selectedPlan}
                holidays={holidays}
              />
              
              <StatsPanel
                vacationDays={selectedDates}
                holidays={holidays}
                availablePTODays={selectedPlan.availablePTODays}
                onViewInsights={() => setActiveTab('insights')}
              />

              {selectedPlan.vacationDays && selectedPlan.vacationDays.length > 0 && (() => {
                const sortedDates = [...selectedPlan.vacationDays].sort();
                return (
                  <BudgetCalculator
                    planId={selectedPlan.id}
                    startDate={sortedDates[0]}
                    endDate={sortedDates[sortedDates.length - 1]}
                    periodLabel={selectedPlan.name}
                  />
                );
              })()}
              
              <ExportPanel
                plan={selectedPlan}
                currentSelectedDates={selectedDates}
              />

              <PublicCalendarToggle plan={selectedPlan} />
              
              <div className="holiday-planner">
                <Calendar
                  selectedDates={selectedDates}
                  suggestedDates={[]}
                  holidays={holidays.filter(holiday => {
                    const today = startOfDay(new Date());
                    const holidayDate = startOfDay(parseISO(holiday.date));
                    return !isPast(holidayDate) || isSameDay(holidayDate, today);
                  })}
                  companyHolidays={planningConfig.companyHolidays}
                  onDateClick={() => {}}
                  year={year}
                  focusOnDates={selectedPlan.vacationDays}
                />
              </div>
            </>
          ) : (
            <>
              <div className="config-header">
                <button
                  onClick={() => setShowMultiYearView(!showMultiYearView)}
                  className="view-toggle-button"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.5rem 1rem',
                    background: showMultiYearView ? 'var(--accent)' : 'var(--surface)',
                    color: showMultiYearView ? 'white' : 'var(--ink)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {showMultiYearView ? '← Single Year View' : 'Multi-Year Overview'}
                </button>
              </div>

              {showMultiYearView ? (
                <MultiYearOverview
                  onSelectPlan={(plan) => {
                    setSelectedPlan(plan);
                    setShowMultiYearView(false);
                  }}
                />
              ) : (
                <PlanList
                  plans={plans}
                  onUpdatePlan={updatePlan}
                  onDeletePlan={deletePlan}
                  onSelectPlan={(plan) => setSelectedPlan(plan)}
                  currentVacationDays={selectedDates}
                  currentHolidays={holidays}
                  currentCountryCode={countryCode}
                  currentYear={year}
                />
              )}
            </>
          )
        )}
        
        {activeTab === 'insights' && (
          <VacationAnalytics
            plans={plans}
            totalAvailablePTO={getTotalPTODays()}
            countryCode={countryCode}
            year={year}
            holidays={holidays}
          />
        )}
        
        {activeTab === 'chat' && isAIAvailable && (
          <ChatAssistant
            holidays={holidays}
            year={year}
            countryCode={countryCode}
            currentPlan={selectedDates.length > 0 ? { vacationDays: selectedDates } : undefined}
            preferences={preferences}
          />
        )}
        
        {activeTab === 'team' && (
          <>
            <TeamPanel
              selectedDates={selectedDates}
              selectedPlan={selectedPlan}
              holidays={holidays}
            />
            
            <WishlistPanel
              suggestions={optimizedSuggestions.length > 0 ? optimizedSuggestions : aiSuggestions}
              onApplySuggestion={applySuggestionToPlan}
            />
          </>
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab 
            onResetAll={handleResetAll}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            contrast={contrast}
            onContrastChange={setContrast}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            countryCode={countryCode}
          />
        )}
      </main>
      
      <OfflineIndicator />
    </div>
  );
}

export default App;
