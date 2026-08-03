import { useEffect, useMemo, useState } from 'react';
import { generateSmartRecommendations } from '../../utils/smartRecommendations';
import type { SmartRecommendation } from '../../utils/smartRecommendations';
import type { PublicHoliday } from '../../utils/types';
import {
  buildWeatherInsights,
  fetchClimateSummary,
  fetchNearTermForecast,
  WEATHER_CITY_CHANGED_EVENT,
  type ClimateSummary,
  type NearTermDay,
} from '../../services/openMeteo';
import './SmartRecommendations.css';

interface SmartRecommendationsProps {
  countryCode: string;
  year: number;
  holidays: PublicHoliday[];
  onApplyMonths?: (months: number[]) => void;
}

type WeatherStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export const SmartRecommendations = ({
  countryCode,
  year,
  holidays,
  onApplyMonths,
}: SmartRecommendationsProps) => {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [climate, setClimate] = useState<ClimateSummary | null>(null);
  const [forecastDays, setForecastDays] = useState<NearTermDay[]>([]);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('idle');
  const [forecastPlace, setForecastPlace] = useState<string>('');
  const [weatherCityTick, setWeatherCityTick] = useState(0);

  useEffect(() => {
    const onCityChange = () => setWeatherCityTick(t => t + 1);
    window.addEventListener(WEATHER_CITY_CHANGED_EVENT, onCityChange);
    return () => window.removeEventListener(WEATHER_CITY_CHANGED_EVENT, onCityChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWeatherStatus('loading');
    setClimate(null);
    setForecastDays([]);
    setForecastPlace('');

    (async () => {
      const [summary, forecast] = await Promise.all([
        fetchClimateSummary(countryCode),
        fetchNearTermForecast(countryCode),
      ]);
      if (cancelled) return;

      if (summary) {
        setClimate(summary);
        setWeatherStatus('ready');
      } else {
        setWeatherStatus('unavailable');
      }

      if (forecast) {
        setForecastDays(forecast.days);
        setForecastPlace(forecast.location.name);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode, weatherCityTick]);

  const weatherInsights = useMemo(
    () => (climate ? buildWeatherInsights(climate) : []),
    [climate]
  );

  const recommendations = useMemo(() => {
    try {
      return generateSmartRecommendations(
        countryCode,
        year,
        holidays,
        climate,
        weatherInsights
      );
    } catch {
      return [];
    }
  }, [countryCode, year, holidays, climate, weatherInsights]);

  const filteredRecommendations = useMemo(() => {
    if (!selectedFilter) return recommendations;
    return recommendations.filter(rec => rec.type === selectedFilter);
  }, [recommendations, selectedFilter]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (recommendations.length === 0 && weatherStatus !== 'loading') {
    return (
      <div className="smart-recommendations">
        <div className="recommendations-empty">
          <p>No recommendations available yet. Select a country and year to get started.</p>
        </div>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    seasonal: 'Seasonal',
    weather: 'Weather',
    'travel-timing': 'Timing tips',
    'local-event': 'Seasonal notes',
  };

  const availableTypes = Array.from(new Set(recommendations.map(r => r.type)));

  const niceForecastDays = forecastDays.filter(d => d.precipMm < 2 && d.tempMaxC >= 12 && d.tempMaxC <= 28).slice(0, 3);

  return (
    <div className="smart-recommendations">
      <header className="recommendations-header">
        <h3>Smart Recommendations</h3>
        <p className="recommendations-subtitle">
          Seasonal heuristics and climate averages for {countryCode} · {year} — not live deals or event listings
          {weatherStatus === 'loading' && ' · Loading climate…'}
          {weatherStatus === 'ready' && climate && ` · Climate near ${climate.location.name}`}
          {weatherStatus === 'unavailable' && ' · Climate unavailable (seasonal heuristics only)'}
        </p>
      </header>

      {climate && (
        <div className="climate-strip" aria-label="Monthly climate overview">
          {climate.months.map(m => (
            <div key={m.month} className="climate-chip" title={`~${Math.round(m.avgPrecipMm)}mm precip`}>
              <span className="climate-month">{monthNames[m.month]}</span>
              <span className="climate-temp">{Math.round(m.avgTempC)}°</span>
            </div>
          ))}
        </div>
      )}

      {niceForecastDays.length > 0 && (
        <div className="forecast-tip">
          <strong>Next 2 weeks near {forecastPlace}:</strong>{' '}
          milder, drier days look likely around{' '}
          {niceForecastDays.map(d => d.date.slice(5)).join(', ')}.
        </div>
      )}

      {availableTypes.length > 1 && (
        <div className="recommendations-filters">
          <button
            type="button"
            className={`filter-chip ${!selectedFilter ? 'active' : ''}`}
            onClick={() => setSelectedFilter(null)}
          >
            All
          </button>
          {availableTypes.map(type => (
            <button
              type="button"
              key={type}
              className={`filter-chip ${selectedFilter === type ? 'active' : ''}`}
              onClick={() => setSelectedFilter(type)}
            >
              {typeLabels[type] || type}
            </button>
          ))}
        </div>
      )}

      <div className="recommendations-grid">
        {filteredRecommendations.map((rec, idx) => (
          <RecommendationCard
            key={`${rec.type}-${rec.title}-${idx}`}
            recommendation={rec}
            onApplyMonths={onApplyMonths}
          />
        ))}
      </div>

      <footer className="recommendations-footer">
        <p className="recommendations-disclaimer">
          Weather climate data by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>
          {climate ? ` (averages near ${climate.location.name})` : ''}. Timing and season notes are heuristics — not travel deals, booking prices, or live local events.
        </p>
      </footer>
    </div>
  );
};

interface RecommendationCardProps {
  recommendation: SmartRecommendation;
  onApplyMonths?: (months: number[]) => void;
}

const RecommendationCard = ({ recommendation, onApplyMonths }: RecommendationCardProps) => {
  const getMonthNames = (months: number[]): string => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(m => names[m]).join(', ');
  };

  const typeColors: Record<string, string> = {
    seasonal: 'var(--accent)',
    weather: 'var(--sun)',
    'travel-timing': 'var(--company)',
    'local-event': 'var(--holiday)',
  };

  return (
    <div
      className="recommendation-card"
      style={{ '--card-accent': typeColors[recommendation.type] } as React.CSSProperties}
    >
      <div className="recommendation-content">
        <h4 className="recommendation-title">
          {recommendation.title}
          {recommendation.source === 'open-meteo' && (
            <span className="recommendation-badge">Open-Meteo</span>
          )}
        </h4>
        <p className="recommendation-detail">{recommendation.detail}</p>
        {recommendation.relatedMonths.length > 0 && (
          <div className="recommendation-months">
            <span className="months-label">Best months:</span>
            <span className="months-value">{getMonthNames(recommendation.relatedMonths)}</span>
          </div>
        )}
        {onApplyMonths && recommendation.relatedMonths.length > 0 && (
          <button
            type="button"
            className="apply-months-button"
            onClick={() => onApplyMonths(recommendation.relatedMonths)}
            title="Apply these months to your vacation filters"
          >
            Apply months
          </button>
        )}
      </div>
    </div>
  );
};
