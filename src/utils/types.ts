export interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface HolidayPlan {
  id: string;
  name: string;
  description?: string;
  countryCode: string;
  year: number;
  vacationDays: string[];
  publicHolidays: PublicHoliday[];
  companyHolidays?: CompanyHoliday[];
  strategy?: VacationStrategy;
  availablePTODays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanSuggestion {
  startDate: string;
  endDate: string;
  vacationDaysUsed: number;
  totalDaysOff: number;
  efficiency: number;
  reason: string;
  publicHolidaysIncluded: PublicHoliday[];
}

export interface UserPreferences {
  preferredMonths: number[];
  typicalDuration: number;
  efficiencyGoal: number;
  pastPlans: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


export type VacationStrategy = 
  | 'balanced'      // Balanced Mix - smart blend of short breaks and longer vacations
  | 'long-weekends' // Long Weekends - more 3-4 day weekends
  | 'mini-breaks'   // Mini Breaks - several shorter 5-6 day breaks
  | 'week-long'     // Week-long Breaks - focused 7-9 day breaks
  | 'extended';     // Extended Vacations - longer 10-15 day vacations

export interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
  countryCode?: string;
}

export interface PTOCarryover {
  days: number;
  expiryMonth: number; // 1-12, expires at end of that month in the planning year
}

export interface PlanningConfig {
  availablePTODays: number;
  strategy?: VacationStrategy;
  timeframe: {
    type: 'calendar-year' | 'custom';
    startDate?: string;
    endDate?: string;
    year?: number;
  };
  companyHolidays: CompanyHoliday[];
  selectedRegions?: string[];
  carryover?: PTOCarryover;
}

export interface VacationTemplate {
  id: string;
  name: string;
  description?: string;
  strategy?: VacationStrategy;
  preferredMonths?: number[];
  typicalDurationDays?: number;
  isBuiltIn?: boolean;
}

export type SuggestionSortBy = 'efficiency' | 'totalDaysOff' | 'startDate' | 'vacationDaysUsed';

export interface SuggestionFilters {
  months: number[];
  seasons: string[];
  minDuration?: number;
  maxDuration?: number;
  minEfficiency?: number;
  excludeDateRanges: Array<{ start: string; end: string }>;
  excludeHolidayNames: string[];
  sortBy: SuggestionSortBy;
}

export interface VacationBudget {
  id: string;
  planId?: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  estimatedTravel: number;
  estimatedLodging: number;
  estimatedFood: number;
  estimatedOther: number;
  currency: string;
  peakSeasonMultiplier?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  enabled: boolean;
  daysBeforeVacation: number[];
  ptoRequestDeadlineDays?: number;
  bookingWindowDays?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  color?: string;
  timeOff: string[]; // YYYY-MM-DD dates
}

export interface WishlistItem {
  id: string;
  name: string;
  priority: number;
  startDate?: string;
  endDate?: string;
  preferredMonths?: number[]; // 1-12
  notes?: string;
}

export interface PlanVersion {
  id: string;
  planId: string;
  label: string;
  snapshot: HolidayPlan;
  createdAt: string;
}

