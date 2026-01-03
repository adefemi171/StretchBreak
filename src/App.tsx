import { useState, useEffect, useRef } from 'react';
import { HolidayPlanner } from './components/HolidayPlanner/HolidayPlanner';
import { Calendar } from './components/Calendar/Calendar';
import { StatsPanel } from './components/Statistics/StatsPanel';
import { PlanList } from './components/PlanManager/PlanList';
import { PlanBreakdown } from './components/PlanManager/PlanBreakdown';
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
import { createPlanId, getAllPlans, clearAllPlans, getUsedStrategies } from './services/planStorage';
import { getSharedPlanFromUrl } from './services/shareService';
import { setTotalPTODays, getTotalPTODays, getRemainingPTODays, hasSavedPlansWithPTO, resetAllPTOData, getAvailablePTODaysInput } from './services/ptoTracking';
import { SettingsTab } from './components/Settings/SettingsTab';
import { optimizeByStrategy } from './utils/strategyOptimizer';
import { filterHolidaysByRegions } from './utils/holidayFilter';
import { parseDateString, formatDate } from './utils/dateUtils';
import { startOfYear, endOfYear, isPast, parseISO, startOfDay, isSameDay, eachDayOfInterval } from 'date-fns';
import type { HolidayPlan, PlanningConfig, VacationStrategy } from './utils/types';
import './App.css';

function App() {
  const [countryCode, setCountryCode] = useState(() => {
    const saved = localStorage.getItem('lastCountryCode');
    return saved || 'NL';
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<HolidayPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'plans' | 'chat' | 'settings'>('planner');
  const [shouldApplyAutoDetect, setShouldApplyAutoDetect] = useState(true);
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
    return {
      availablePTODays: persistedInput > 0 ? persistedInput : initialPTO,
      timeframe: {
        type: 'calendar-year',
        year: new Date().getFullYear(),
      },
      companyHolidays: [],
      selectedRegions: [],
    };
  });
  
  const year = planningConfig.timeframe.type === 'calendar-year' 
    ? (planningConfig.timeframe.year || new Date().getFullYear())
    : planningConfig.timeframe.startDate 
      ? new Date(planningConfig.timeframe.startDate).getFullYear()
      : new Date().getFullYear();
  const [optimizedSuggestions, setOptimizedSuggestions] = useState<any[]>([]);
  const [showConfig, setShowConfig] = useState(() => {
    // Don't show config if there are saved plans with PTO
    return !hasSavedPlansWithPTO();
  });
  
  // Clear optimized suggestions when year or country changes to prevent stale data
  useEffect(() => {
    setOptimizedSuggestions([]);
  }, [year, countryCode]);
  
  const { holidays: allHolidays, loading: holidaysLoading, error: holidaysError } = useHolidays(year, countryCode);
  
  const holidays = planningConfig.selectedRegions && planningConfig.selectedRegions.length > 0
    ? filterHolidaysByRegions(allHolidays, planningConfig.selectedRegions)
    : allHolidays;
  
  const { addPlan, plans, loadPlans } = usePlans();
  const { aiSuggestions, loading: aiLoading, error: aiError, generateSuggestions, isAIAvailable } = useAI();
  const { preferences, updateFromPlan } = usePreferences();
  const { detectedCountry, isDetecting, detectLocation } = useLocation();
  
  useEffect(() => {
    detectLocation();
  }, []);
  
  // Update remaining PTO when plans change
  useEffect(() => {
    if (getTotalPTODays() > 0) {
      const remaining = getRemainingPTODays();
      setPlanningConfig(prev => ({
        ...prev,
        availablePTODays: remaining,
      }));
    }
  }, [plans]);

  useEffect(() => {
    if (holidays.length > 0 && !holidaysLoading && isAIAvailable) {
      generateSuggestions(holidays, year, preferences);
    }
  }, [holidays.length, holidaysLoading, year, isAIAvailable]);
  
  useEffect(() => {
    localStorage.setItem('lastCountryCode', countryCode);
  }, [countryCode]);
  
  useEffect(() => {
    const sharedPlan = getSharedPlanFromUrl();
    if (sharedPlan) {
      const newPlan: HolidayPlan = {
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
  
  const handleCountryChange = (newCountryCode: string) => {
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
    const remaining = getRemainingPTODays();
    setPlanningConfig(prev => ({
      ...prev,
      availablePTODays: remaining,
    }));
    
    alert('Plan saved successfully!');
  };

  const applyStrategyAndSave = (strategyToApply: VacationStrategy) => {
    // Use remaining PTO if available, otherwise use configured PTO
    const availablePTO = getTotalPTODays() > 0 ? getRemainingPTODays() : planningConfig.availablePTODays;
    
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
        const remaining = getRemainingPTODays();
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
    const availablePTO = getTotalPTODays() > 0 ? getRemainingPTODays() : planningConfig.availablePTODays;
    
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
        const remaining = getRemainingPTODays();
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
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>StretchBreak</h1>
            <p className="subtitle">Maximize your vacation time with smart planning</p>
          </div>
        </div>
      </header>
      
      <div className="app-controls">
        <div className="location-control">
          <CountrySelector value={countryCode} onChange={handleCountryChange} />
          <button
            onClick={async () => {
              setShouldApplyAutoDetect(true);
              await detectLocation();
            }}
            disabled={isDetecting}
            className="refresh-location-button"
            title="Refresh and use auto-detected country"
          >
            {isDetecting ? '⏳' : '🔄'}
          </button>
          {detectedCountry && countryCode === detectedCountry && (
            <span className="location-success" title="Country auto-detected">
              ✓
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
      
      <div className="app-tabs">
        <button
          className={`tab ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
        >
          Planner
        </button>
        <button
          className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Saved Plans
        </button>
        {isAIAvailable && (
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            AI Assistant
          </button>
        )}
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>
      
      <main className="app-main">
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
                    🤖 AI is analyzing holidays and generating suggestions...
                  </div>
                )}
                
                {aiError && (
                  <div className="error-message">
                    ⚠️ AI Error: {aiError}
                  </div>
                )}
                
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
                    const remaining = getRemainingPTODays();
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
                  <h3>Save Your Plan</h3>
                  <button
                    onClick={() => {
                      const name = prompt('Enter plan name:');
                      if (name) {
                        const description = prompt('Enter description (optional):');
                        handleSavePlan(name, description || undefined);
                      }
                    }}
                    className="save-button"
                    disabled={selectedDates.length === 0}
                  >
                    Save Plan
                  </button>
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
              
              <PlanBreakdown
                plan={selectedPlan}
                holidays={holidays}
              />
              
              <StatsPanel
                vacationDays={selectedDates}
                holidays={holidays}
                availablePTODays={selectedPlan.availablePTODays}
              />
              
              <ExportPanel
                plan={selectedPlan}
                currentSelectedDates={selectedDates}
              />
              
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
            <PlanList
              onSelectPlan={(plan) => setSelectedPlan(plan)}
              currentVacationDays={selectedDates}
              currentHolidays={holidays}
              currentCountryCode={countryCode}
              currentYear={year}
              onPlanDeleted={() => {
                // Recalculate remaining PTO when a plan is deleted
                const remaining = getRemainingPTODays();
                setPlanningConfig(prev => ({
                  ...prev,
                  availablePTODays: remaining,
                }));
              }}
            />
          )
        )}
        
        {activeTab === 'chat' && isAIAvailable && (
          <ChatAssistant
            holidays={holidays}
            year={year}
            currentPlan={selectedDates.length > 0 ? { vacationDays: selectedDates } : undefined}
            preferences={preferences}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab onResetAll={handleResetAll} />
        )}
      </main>
    </div>
  );
}

export default App;
