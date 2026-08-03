import type { HolidayPlan } from './types';
import { calculateEfficiency } from './planningAlgorithm';
import { parseISO, getMonth, getYear } from 'date-fns';

export interface YearStats {
  year: number;
  ptoUsed: number;
  totalDaysOff: number;
  avgEfficiency: number;
  planCount: number;
  plans: HolidayPlan[];
}

export interface MonthDistribution {
  month: number; // 0-11 (Jan-Dec)
  vacationDays: number;
  plans: number;
}

export interface EfficiencyTrend {
  planId: string;
  planName: string;
  efficiency: number;
  year: number;
  updatedAt: string;
}

export interface AnalyticsInsight {
  type: 'best-month' | 'efficiency-leader' | 'yoy-comparison' | 'pattern';
  title: string;
  description: string;
  value?: string | number;
}

export interface VacationAnalytics {
  yearStats: YearStats[];
  monthDistribution: MonthDistribution[];
  efficiencyTrend: EfficiencyTrend[];
  insights: AnalyticsInsight[];
  totalPTOAllTime: number;
  avgEfficiencyAllTime: number;
  totalPlansCount: number;
  utilizationRate?: number; // If total PTO is known
}

/**
 * Calculate per-year statistics
 */
export const calculateYearStats = (plans: HolidayPlan[]): YearStats[] => {
  const yearMap = new Map<number, HolidayPlan[]>();
  
  plans.forEach(plan => {
    const existing = yearMap.get(plan.year) || [];
    yearMap.set(plan.year, [...existing, plan]);
  });
  
  const yearStats: YearStats[] = [];
  
  yearMap.forEach((yearPlans, year) => {
    let totalPTO = 0;
    let totalDaysOff = 0;
    let totalEfficiency = 0;
    
    yearPlans.forEach(plan => {
      const { vacationDaysUsed, totalDaysOff: daysOff } = calculateEfficiency(
        plan.vacationDays,
        plan.publicHolidays
      );
      totalPTO += vacationDaysUsed;
      totalDaysOff += daysOff;
      const efficiency = vacationDaysUsed > 0 ? daysOff / vacationDaysUsed : 0;
      totalEfficiency += efficiency;
    });
    
    const avgEfficiency = yearPlans.length > 0 ? totalEfficiency / yearPlans.length : 0;
    
    yearStats.push({
      year,
      ptoUsed: totalPTO,
      totalDaysOff,
      avgEfficiency,
      planCount: yearPlans.length,
      plans: yearPlans,
    });
  });
  
  return yearStats.sort((a, b) => b.year - a.year);
};

/**
 * Calculate month distribution (vacation days per month)
 */
export const calculateMonthDistribution = (plans: HolidayPlan[]): MonthDistribution[] => {
  const monthMap = new Map<number, { days: number; planSet: Set<string> }>();
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthMap.set(i, { days: 0, planSet: new Set() });
  }
  
  plans.forEach(plan => {
    plan.vacationDays.forEach(dateStr => {
      try {
        const date = parseISO(dateStr);
        const month = getMonth(date);
        const current = monthMap.get(month)!;
        current.days += 1;
        current.planSet.add(plan.id);
      } catch {
        // Skip invalid dates
      }
    });
  });
  
  const distribution: MonthDistribution[] = [];
  monthMap.forEach((data, month) => {
    distribution.push({
      month,
      vacationDays: data.days,
      plans: data.planSet.size,
    });
  });
  
  return distribution;
};

/**
 * Calculate efficiency trend over time
 */
export const calculateEfficiencyTrend = (plans: HolidayPlan[]): EfficiencyTrend[] => {
  const trends = plans.map(plan => {
    const { vacationDaysUsed, totalDaysOff } = calculateEfficiency(
      plan.vacationDays,
      plan.publicHolidays
    );
    const efficiency = vacationDaysUsed > 0 ? totalDaysOff / vacationDaysUsed : 0;
    
    return {
      planId: plan.id,
      planName: plan.name,
      efficiency,
      year: plan.year,
      updatedAt: plan.updatedAt,
    };
  });
  
  // Sort by updatedAt (most recent first)
  return trends.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

/**
 * Generate insights from analytics data
 */
export const generateInsights = (
  yearStats: YearStats[],
  monthDistribution: MonthDistribution[],
  efficiencyTrend: EfficiencyTrend[]
): AnalyticsInsight[] => {
  const insights: AnalyticsInsight[] = [];
  
  // Best month by vacation days
  const bestMonth = [...monthDistribution].sort((a, b) => b.vacationDays - a.vacationDays)[0];
  if (bestMonth && bestMonth.vacationDays > 0) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    insights.push({
      type: 'best-month',
      title: 'Most Popular Month',
      description: `You take most vacation days in ${monthNames[bestMonth.month]} (${bestMonth.vacationDays} days across ${bestMonth.plans} plan${bestMonth.plans === 1 ? '' : 's'}).`,
      value: monthNames[bestMonth.month],
    });
  }
  
  // Efficiency leader
  if (efficiencyTrend.length > 0) {
    const bestPlan = [...efficiencyTrend].sort((a, b) => b.efficiency - a.efficiency)[0];
    if (bestPlan.efficiency > 0) {
      insights.push({
        type: 'efficiency-leader',
        title: 'Best Efficiency',
        description: `"${bestPlan.planName}" achieved ${bestPlan.efficiency.toFixed(1)}× efficiency — your best stretch so far.`,
        value: bestPlan.efficiency.toFixed(1),
      });
    }
  }
  
  // Year-over-year comparison
  if (yearStats.length >= 2) {
    const sortedYears = [...yearStats].sort((a, b) => b.year - a.year);
    const thisYear = sortedYears[0];
    const lastYear = sortedYears[1];
    const efficiencyDiff = thisYear.avgEfficiency - lastYear.avgEfficiency;
    const ptoDiff = thisYear.ptoUsed - lastYear.ptoUsed;
    
    if (efficiencyDiff !== 0) {
      const direction = efficiencyDiff > 0 ? 'improved' : 'decreased';
      const change = Math.abs(efficiencyDiff).toFixed(1);
      insights.push({
        type: 'yoy-comparison',
        title: 'Year-over-Year Trend',
        description: `Your efficiency ${direction} by ${change}× from ${lastYear.year} to ${thisYear.year}. PTO used: ${ptoDiff >= 0 ? '+' : ''}${ptoDiff} days.`,
        value: `${efficiencyDiff >= 0 ? '+' : ''}${change}`,
      });
    }
  }
  
  // Pattern detection: consistent months
  const popularMonths = monthDistribution
    .filter(m => m.vacationDays > 0)
    .sort((a, b) => b.vacationDays - a.vacationDays)
    .slice(0, 3);
  
  if (popularMonths.length >= 2) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const topMonthNames = popularMonths.map(m => monthNames[m.month]).join(', ');
    insights.push({
      type: 'pattern',
      title: 'Vacation Pattern',
      description: `You typically plan vacations around ${topMonthNames}.`,
    });
  }
  
  return insights;
};

/**
 * Calculate utilization rate if total PTO is known
 */
export const calculateUtilizationRate = (
  plans: HolidayPlan[],
  totalAvailablePTO?: number
): number | undefined => {
  if (!totalAvailablePTO || totalAvailablePTO <= 0) return undefined;
  
  const totalUsed = plans.reduce((sum, plan) => {
    const { vacationDaysUsed } = calculateEfficiency(plan.vacationDays, plan.publicHolidays);
    return sum + vacationDaysUsed;
  }, 0);
  
  return totalUsed / totalAvailablePTO;
};

/**
 * Main analytics aggregation function
 */
export const aggregateVacationAnalytics = (
  plans: HolidayPlan[],
  totalAvailablePTO?: number
): VacationAnalytics => {
  if (plans.length === 0) {
    return {
      yearStats: [],
      monthDistribution: [],
      efficiencyTrend: [],
      insights: [],
      totalPTOAllTime: 0,
      avgEfficiencyAllTime: 0,
      totalPlansCount: 0,
    };
  }
  
  const yearStats = calculateYearStats(plans);
  const monthDistribution = calculateMonthDistribution(plans);
  const efficiencyTrend = calculateEfficiencyTrend(plans);
  const insights = generateInsights(yearStats, monthDistribution, efficiencyTrend);
  
  const totalPTOAllTime = yearStats.reduce((sum, year) => sum + year.ptoUsed, 0);
  const avgEfficiencyAllTime = yearStats.length > 0
    ? yearStats.reduce((sum, year) => sum + year.avgEfficiency, 0) / yearStats.length
    : 0;
  
  const utilizationRate = calculateUtilizationRate(plans, totalAvailablePTO);
  
  return {
    yearStats,
    monthDistribution,
    efficiencyTrend,
    insights,
    totalPTOAllTime,
    avgEfficiencyAllTime,
    totalPlansCount: plans.length,
    utilizationRate,
  };
};
