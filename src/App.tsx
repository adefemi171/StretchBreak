import { useState, useEffect, useRef } from 'react';
import { HolidayPlanner } from './components/HolidayPlanner/HolidayPlanner';
import { Calendar } from './components/Calendar/Calendar';
import { StatsPanel } from './components/Statistics/StatsPanel';
import { PlanList } from './components/PlanManager/PlanList';
import { PlanBreakdown } from './components/PlanManager/PlanBreakdown';
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
import { parseDateString } from './utils/dateUtils';
import { startOfYear, endOfYear, isPast, parseISO, startOfDay, isSameDay } from 'date-fns';
import type { HolidayPlan, PlanningConfig } from './utils/types';
import './App.css';

function App() {
  const [countryCode, setCountryCode] = useState(() => {
    const saved = localStorage.getItem('lastCountryCode');
    return saved || 'NL';
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<HolidayPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'plans' | 'chat'>('planner');
  const [shouldApplyAutoDetect, setShouldApplyAutoDetect] = useState(true);
  const [planningConfig, setPlanningConfig] = useState<PlanningConfig>({
    availablePTODays: 0,
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
  const [optimizedSuggestions, setOptimizedSuggestions] = useState<any[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const plannerViewRef = useRef<HTMLDivElement>(null);
  
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
      // Filter out past holidays before generating AI suggestions
      const today = startOfDay(new Date());
      const futureHolidays = holidays.filter(holiday => {
        const holidayDate = startOfDay(parseISO(holiday.date));
        return !isPast(holidayDate) || isSameDay(holidayDate, today);
      });
      generateSuggestions(futureHolidays, year, preferences);
    }
  }, [holidays.length, year, isAIAvailable]);
  
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
      setActiveTab('planner');
      setShowConfig(false);
    }
  }, [selectedPlan]);
  
  const handleSavePlan = (planName: string, description?: string) => {
    if (selectedDates.length === 0) {
      alert('Please select some vacation days first');
      return;
    }
    
    const plan: HolidayPlan = {
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

  const handleNaturalLanguageSuccess = (_parsed: any) => {
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
    
    const suggestions = optimizeByStrategy({
      holidays: futureHolidays,
      companyHolidays: planningConfig.companyHolidays,
      availablePTODays: planningConfig.availablePTODays,
      strategy: planningConfig.strategy,
      startDate,
      endDate,
    });
    
    setOptimizedSuggestions(suggestions);
    setShowConfig(false);
    
    setTimeout(() => {
      plannerViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // Removed auto-apply logic - users should choose which suggestion to apply
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎉 StretchBreak</h1>
        <p className="subtitle">Maximize your vacation time with smart planning</p>
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
              <>
                {selectedPlan ? (
                  // View mode for saved plan - show only breakdown and calendar
                  <>
                    <div className="config-header">
                      <button
                        onClick={() => {
                          setSelectedPlan(null);
                          setActiveTab('plans');
                        }}
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
                    
                    <div className="holiday-planner">
                      <div ref={plannerViewRef}>
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
                    </div>
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
                    
                    {isAIAvailable && (
                      <NaturalLanguageInput
                        holidays={holidays}
                        year={year}
                        preferences={preferences}
                        onParseSuccess={handleNaturalLanguageSuccess}
                        onError={(error) => alert(error)}
                      />
                    )}
                    
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
                      holidays={holidays}
                      companyHolidays={planningConfig.companyHolidays}
                      year={year}
                      suggestions={optimizedSuggestions.length > 0 ? optimizedSuggestions : aiSuggestions}
                      selectedDates={selectedDates}
                      onDateChange={setSelectedDates}
                    />
                  </>
                )}
                
                {!selectedPlan && (
                  <>
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
          <PlanList
            onSelectPlan={(plan) => setSelectedPlan(plan)}
            currentVacationDays={selectedDates}
            currentHolidays={holidays}
            currentCountryCode={countryCode}
            currentYear={year}
          />
        )}
        
        {activeTab === 'chat' && isAIAvailable && (
          <ChatAssistant
            holidays={holidays}
            year={year}
            currentPlan={selectedDates.length > 0 ? { vacationDays: selectedDates } : undefined}
            preferences={preferences}
          />
        )}
      </main>
    </div>
  );
}

export default App;
