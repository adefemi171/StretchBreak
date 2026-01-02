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

export interface VacationDay {
  date: string;
  isPublicHoliday: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  isSuggested: boolean;
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

export interface PlanningConfig {
  availablePTODays: number;
  strategy: VacationStrategy;
  timeframe: {
    type: 'calendar-year' | 'custom';
    startDate?: string;
    endDate?: string;
    year?: number;
  };
  companyHolidays: CompanyHoliday[];
  selectedRegions?: string[];
}


