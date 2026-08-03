import type { PublicHoliday } from './types';
import type { ClimateSummary, WeatherInsight } from '../services/openMeteo';

export interface SmartRecommendation {
  type: 'seasonal' | 'weather' | 'travel-timing' | 'local-event';
  title: string;
  detail: string;
  relatedMonths: number[];
  score: number;
  icon?: string;
  source?: 'heuristic' | 'open-meteo';
}

const SOUTHERN_HEMISPHERE_COUNTRIES = ['AU', 'NZ', 'AR', 'CL', 'ZA', 'BR', 'UY', 'PY', 'BO', 'PE'];

const isSouthernHemisphere = (countryCode: string): boolean => {
  return SOUTHERN_HEMISPHERE_COUNTRIES.includes(countryCode.toUpperCase());
};

const getSeasonForMonth = (month: number, isSouthern: boolean): 'spring' | 'summer' | 'fall' | 'winter' => {
  if (isSouthern) {
    if (month >= 8 && month <= 10) return 'spring';
    if (month === 11 || month <= 1) return 'summer';
    if (month >= 2 && month <= 4) return 'fall';
    return 'winter';
  }
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

const getSeasonalRecommendations = (countryCode: string, year: number): SmartRecommendation[] => {
  const recommendations: SmartRecommendation[] = [];
  const isSouthern = isSouthernHemisphere(countryCode);

  if (isSouthern) {
    recommendations.push(
      {
        type: 'seasonal',
        title: 'Summer Beach Season',
        detail: 'December to February offers warm weather ideal for beach vacations and outdoor activities.',
        relatedMonths: [11, 0, 1],
        score: 9,
        icon: '🏖️',
      },
      {
        type: 'seasonal',
        title: 'Autumn Colors',
        detail: 'March to May brings comfortable temperatures and beautiful fall foliage.',
        relatedMonths: [2, 3, 4],
        score: 7,
        icon: '🍂',
      },
      {
        type: 'seasonal',
        title: 'Winter Sports',
        detail: 'June to August is perfect for skiing and mountain activities in the Southern Hemisphere.',
        relatedMonths: [5, 6, 7],
        score: 6,
        icon: '⛷️',
      }
    );
  } else {
    recommendations.push(
      {
        type: 'seasonal',
        title: 'Summer Adventures',
        detail: 'June to August offers long days and warm weather for travel and outdoor adventures.',
        relatedMonths: [5, 6, 7],
        score: 9,
        icon: '☀️',
      },
      {
        type: 'seasonal',
        title: 'Spring Bloom',
        detail: 'March to May features mild weather and blooming nature, ideal for city breaks and hiking.',
        relatedMonths: [2, 3, 4],
        score: 8,
        icon: '🌸',
      },
      {
        type: 'seasonal',
        title: 'Fall Escapes',
        detail: 'September to November offers comfortable temperatures and fewer crowds for travel.',
        relatedMonths: [8, 9, 10],
        score: 7,
        icon: '🍁',
      }
    );
  }

  return recommendations;
};

const getWeatherRecommendations = (countryCode: string, year: number): SmartRecommendation[] => {
  const recommendations: SmartRecommendation[] = [];
  const isSouthern = isSouthernHemisphere(countryCode);

  const europeanCountries = ['DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'CH', 'GB', 'IE', 'SE', 'NO', 'DK', 'FI'];
  const isEurope = europeanCountries.includes(countryCode.toUpperCase());

  const tropicalCountries = ['TH', 'ID', 'MY', 'SG', 'PH', 'VN', 'IN', 'LK'];
  const isTropical = tropicalCountries.includes(countryCode.toUpperCase());

  if (isTropical) {
    recommendations.push({
      type: 'weather',
      title: 'Dry Season Travel',
      detail: 'November to March typically offers the best weather with less rain and comfortable temperatures.',
      relatedMonths: [10, 11, 0, 1, 2],
      score: 9,
      icon: '🌤️',
    });
  } else if (isEurope && !isSouthern) {
    recommendations.push(
      {
        type: 'weather',
        title: 'Mediterranean Summer',
        detail: 'June to September brings warm, dry weather perfect for coastal and Mediterranean destinations.',
        relatedMonths: [5, 6, 7, 8],
        score: 8,
        icon: '🌊',
      },
      {
        type: 'weather',
        title: 'Shoulder Season',
        detail: 'April-May and September-October offer pleasant weather with fewer tourists.',
        relatedMonths: [3, 4, 8, 9],
        score: 7,
        icon: '🌤️',
      }
    );
  }

  return recommendations;
};

const getTravelTimingRecommendations = (countryCode: string, year: number): SmartRecommendation[] => {
  const recommendations: SmartRecommendation[] = [];
  const isSouthern = isSouthernHemisphere(countryCode);

  if (isSouthern) {
    recommendations.push(
      {
        type: 'travel-timing',
        title: 'Shoulder seasons',
        detail: 'March–May and September–November are typically quieter travel windows in the Southern Hemisphere.',
        relatedMonths: [2, 3, 4, 8, 9, 10],
        score: 8,
        icon: '💰',
      },
      {
        type: 'travel-timing',
        title: 'Peak season window',
        detail: 'December and January are often busy. Plan ahead if traveling then — this is a seasonal note, not live pricing.',
        relatedMonths: [11, 0],
        score: 6,
        icon: '📈',
      }
    );
  } else {
    recommendations.push(
      {
        type: 'travel-timing',
        title: 'Shoulder seasons',
        detail: 'January–February and October–November are often quieter travel windows — a seasonal heuristic, not live deals.',
        relatedMonths: [0, 1, 9, 10],
        score: 8,
        icon: '💰',
      },
      {
        type: 'travel-timing',
        title: 'Summer peak window',
        detail: 'July and August are typically busy travel months. Consider shoulder months if you prefer quieter trips.',
        relatedMonths: [6, 7],
        score: 6,
        icon: '📈',
      }
    );
  }

  return recommendations;
};

const getLocalEventRecommendations = (
  countryCode: string,
  year: number,
  holidays: PublicHoliday[]
): SmartRecommendation[] => {
  const recommendations: SmartRecommendation[] = [];
  const isSouthern = isSouthernHemisphere(countryCode);

  const europeanCountries = ['DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'CH', 'GB', 'IE'];
  const isEurope = europeanCountries.includes(countryCode.toUpperCase());
  
  const alpineCountries = ['AT', 'CH', 'FR', 'IT', 'DE'];
  const isAlpine = alpineCountries.includes(countryCode.toUpperCase());

  if (isEurope && !isSouthern) {
    const hasChristmas = holidays.some(h => 
      h.date.includes('-12-25') || h.name.toLowerCase().includes('christmas')
    );
    
    if (hasChristmas) {
      recommendations.push({
        type: 'local-event',
        title: 'Holiday season (Europe)',
        detail: 'November–December often feature Christmas markets in many European cities — a seasonal note, not a live event calendar.',
        relatedMonths: [10, 11],
        score: 8,
        icon: '🎄',
      });
    }

    recommendations.push({
      type: 'local-event',
      title: 'Summer festival season',
      detail: 'June–August is a common window for outdoor festivals and concerts in Europe — heuristic only, not live listings.',
      relatedMonths: [5, 6, 7],
      score: 7,
      icon: '🎪',
    });
  }

  if (isAlpine && !isSouthern) {
    recommendations.push({
      type: 'local-event',
      title: 'Ski season window',
      detail: 'December–March is the typical Alpine ski season. Check local conditions before planning.',
      relatedMonths: [11, 0, 1, 2],
      score: 8,
      icon: '⛷️',
    });
  }

  if (countryCode.toUpperCase() === 'US') {
    recommendations.push(
      {
        type: 'local-event',
        title: 'Fall foliage window',
        detail: 'September–October is a common leaf-peeping season in New England and mountain regions — seasonal heuristic only.',
        relatedMonths: [8, 9],
        score: 7,
        icon: '🍂',
      },
      {
        type: 'local-event',
        title: 'Spring break window',
        detail: 'March–April are often busy for beach and family travel in the US. Not a live events calendar.',
        relatedMonths: [2, 3],
        score: 6,
        icon: '🏖️',
      }
    );
  }

  if (countryCode.toUpperCase() === 'JP') {
    recommendations.push(
      {
        type: 'local-event',
        title: 'Cherry blossom window',
        detail: 'Late March to early April is the typical sakura season — timing varies by region and year.',
        relatedMonths: [2, 3],
        score: 10,
        icon: '🌸',
      },
      {
        type: 'local-event',
        title: 'Autumn leaves window',
        detail: 'October–November often bring fall colors and milder temperatures in Japan.',
        relatedMonths: [9, 10],
        score: 8,
        icon: '🍁',
      }
    );
  }

  if (['AU', 'NZ'].includes(countryCode.toUpperCase())) {
    recommendations.push({
      type: 'local-event',
      title: 'Summer festival window',
      detail: 'January–March (southern summer) is a common outdoor-events season — heuristic, not live listings.',
      relatedMonths: [0, 1, 2],
      score: 7,
      icon: '🎭',
    });
  }

  return recommendations;
};

export const generateSmartRecommendations = (
  countryCode: string,
  year: number,
  holidays: PublicHoliday[],
  climate?: ClimateSummary | null,
  weatherInsights?: WeatherInsight[] | null
): SmartRecommendation[] => {
  const heuristicWeather = getWeatherRecommendations(countryCode, year);
  const liveWeather: SmartRecommendation[] = (weatherInsights || []).map(insight => ({
    type: 'weather' as const,
    title: insight.title,
    detail: insight.detail,
    relatedMonths: insight.relatedMonths,
    score: insight.score,
    icon: '🌤️',
    source: 'open-meteo' as const,
  }));

  // Prefer live climate weather cards; keep light heuristics only if no live data
  const weather = liveWeather.length > 0 ? liveWeather : heuristicWeather.map(r => ({
    ...r,
    source: 'heuristic' as const,
  }));

  const allRecommendations = [
    ...getSeasonalRecommendations(countryCode, year),
    ...weather,
    ...getTravelTimingRecommendations(countryCode, year),
    ...getLocalEventRecommendations(countryCode, year, holidays),
  ];

  // Attach climate context score bump for months that match mild climate
  if (climate) {
    const mildMonths = new Set(
      [...climate.months]
        .filter(m => m.avgTempC >= 12 && m.avgTempC <= 26 && m.avgPrecipMm < 90)
        .map(m => m.month)
    );
    for (const rec of allRecommendations) {
      if (rec.relatedMonths.some(m => mildMonths.has(m))) {
        rec.score += 0.5;
      }
    }
  }

  return allRecommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

export const getRecommendationsForMonths = (
  recommendations: SmartRecommendation[],
  months: number[]
): SmartRecommendation[] => {
  return recommendations.filter(rec =>
    rec.relatedMonths.some(m => months.includes(m))
  );
};
