import type { HolidayPlan, PublicHoliday } from './types';
import { parseISO, getMonth, differenceInCalendarDays } from 'date-fns';
import { calculateEfficiency } from './planningAlgorithm';

export interface PopularPeriod {
  startMonth: number;
  endMonth: number;
  count: number;
  label: string;
  reason: string;
}

export interface CommunityInsight {
  type: 'popular-period' | 'best-time' | 'efficiency-pattern' | 'bridge-opportunity';
  title: string;
  description: string;
  relatedMonths?: number[];
  score: number;
}

const getMonthName = (month: number): string => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month] || '';
};

const getMonthRangeLabel = (startMonth: number, endMonth: number): string => {
  if (startMonth === endMonth) {
    return getMonthName(startMonth);
  }
  return `${getMonthName(startMonth)}-${getMonthName(endMonth)}`;
};

const analyzeHolidayBridges = (holidays: PublicHoliday[]): CommunityInsight[] => {
  const insights: CommunityInsight[] = [];
  const monthClusters = new Map<number, PublicHoliday[]>();

  holidays.forEach(holiday => {
    try {
      const date = parseISO(holiday.date);
      const month = getMonth(date);
      const existing = monthClusters.get(month) || [];
      monthClusters.set(month, [...existing, holiday]);
    } catch {
      // Skip invalid dates
    }
  });

  monthClusters.forEach((holidaysInMonth, month) => {
    if (holidaysInMonth.length >= 2) {
      const sortedHolidays = holidaysInMonth.sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = parseISO(sortedHolidays[0].date);
      const lastDate = parseISO(sortedHolidays[sortedHolidays.length - 1].date);
      const daysBetween = differenceInCalendarDays(lastDate, firstDate);

      if (daysBetween <= 14 && daysBetween > 0) {
        insights.push({
          type: 'bridge-opportunity',
          title: `Bridge Opportunity in ${getMonthName(month)}`,
          description: `Multiple holidays create a ${daysBetween}-day window perfect for efficient vacation planning.`,
          relatedMonths: [month],
          score: 8,
        });
      }
    }
  });

  return insights;
};

const calculatePopularPeriods = (plans: HolidayPlan[]): PopularPeriod[] => {
  const monthCounts = new Map<number, number>();

  plans.forEach(plan => {
    const monthsUsed = new Set<number>();
    plan.vacationDays.forEach(dateStr => {
      try {
        const date = parseISO(dateStr);
        const month = getMonth(date);
        monthsUsed.add(month);
      } catch {
        // Skip invalid dates
      }
    });

    monthsUsed.forEach(month => {
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });
  });

  const periods: PopularPeriod[] = [];
  const sortedMonths = Array.from(monthCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  sortedMonths.forEach(([month, count]) => {
    if (count > 0) {
      periods.push({
        startMonth: month,
        endMonth: month,
        count,
        label: getMonthName(month),
        reason: count === 1 ? 'Your past plan' : `${count} of your plans`,
      });
    }
  });

  return periods;
};

const analyzeBestTimes = (plans: HolidayPlan[], holidays: PublicHoliday[]): CommunityInsight[] => {
  const insights: CommunityInsight[] = [];

  if (plans.length === 0) {
    return insights;
  }

  const efficiencyByMonth = new Map<number, { totalEff: number; count: number }>();

  plans.forEach(plan => {
    const monthsInPlan = new Set<number>();
    plan.vacationDays.forEach(dateStr => {
      try {
        const date = parseISO(dateStr);
        monthsInPlan.add(getMonth(date));
      } catch {
        // Skip invalid dates
      }
    });

    const { vacationDaysUsed, totalDaysOff } = calculateEfficiency(
      plan.vacationDays,
      plan.publicHolidays
    );
    const efficiency = vacationDaysUsed > 0 ? totalDaysOff / vacationDaysUsed : 0;

    monthsInPlan.forEach(month => {
      const current = efficiencyByMonth.get(month) || { totalEff: 0, count: 0 };
      efficiencyByMonth.set(month, {
        totalEff: current.totalEff + efficiency,
        count: current.count + 1,
      });
    });
  });

  const avgEfficiencies = Array.from(efficiencyByMonth.entries())
    .map(([month, data]) => ({
      month,
      avgEfficiency: data.totalEff / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEfficiency - a.avgEfficiency);

  if (avgEfficiencies.length > 0 && avgEfficiencies[0].avgEfficiency > 1.5) {
    const best = avgEfficiencies[0];
    insights.push({
      type: 'efficiency-pattern',
      title: 'High-Efficiency Month',
      description: `${getMonthName(best.month)} has shown ${best.avgEfficiency.toFixed(1)}× efficiency in your planning history.`,
      relatedMonths: [best.month],
      score: 9,
    });
  }

  return insights;
};

const analyzePatterns = (plans: HolidayPlan[]): CommunityInsight[] => {
  const insights: CommunityInsight[] = [];

  if (plans.length < 2) {
    return insights;
  }

  const strategies = new Map<string, number>();
  plans.forEach(plan => {
    if (plan.strategy) {
      strategies.set(plan.strategy, (strategies.get(plan.strategy) || 0) + 1);
    }
  });

  const topStrategy = Array.from(strategies.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (topStrategy && topStrategy[1] >= 2) {
    const strategyLabels: Record<string, string> = {
      'balanced': 'balanced mix',
      'long-weekends': 'long weekend',
      'mini-breaks': 'mini break',
      'week-long': 'week-long',
      'extended': 'extended vacation',
    };
    const label = strategyLabels[topStrategy[0]] || topStrategy[0];
    
    insights.push({
      type: 'efficiency-pattern',
      title: 'Preferred Strategy',
      description: `You tend to favor ${label} approaches in your vacation planning.`,
      score: 7,
    });
  }

  return insights;
};

export const generateCommunityInsights = (
  plans: HolidayPlan[],
  holidays: PublicHoliday[],
  year: number
): {
  popularPeriods: PopularPeriod[];
  insights: CommunityInsight[];
} => {
  const yearPlans = plans.filter(p => p.year === year);
  const allPlans = plans.length > 0 ? plans : yearPlans;

  const popularPeriods = calculatePopularPeriods(allPlans);
  
  const bridgeInsights = analyzeHolidayBridges(holidays);
  const bestTimeInsights = analyzeBestTimes(allPlans, holidays);
  const patternInsights = analyzePatterns(allPlans);

  const allInsights = [
    ...bridgeInsights,
    ...bestTimeInsights,
    ...patternInsights,
  ].sort((a, b) => b.score - a.score);

  return {
    popularPeriods: popularPeriods.slice(0, 5),
    insights: allInsights.slice(0, 6),
  };
};

export const getLocalPopularityLabel = (count: number): string => {
  if (count === 0) return 'No history';
  if (count === 1) return 'Used once';
  if (count === 2) return 'Used twice';
  return `Used ${count} times`;
};
