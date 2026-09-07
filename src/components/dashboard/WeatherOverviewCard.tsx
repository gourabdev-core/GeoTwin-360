import React from 'react';
import { Sun, Wind, Droplets, CloudRain, Sunrise, Sunset, Clock } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Skeleton } from '../ui/Skeleton.js';
import { DataStatus } from '../ui/DataStatus.js';
import { WeatherData } from '../../types/domain.js';
import { usePreferences } from '../../context/PreferencesContext.js';

interface WeatherOverviewCardProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export const WeatherOverviewCard: React.FC<WeatherOverviewCardProps> = ({
  weather,
  loading,
  error,
  onRetry,
}) => {
  const { formatTemperature } = usePreferences();
  const [iconError, setIconError] = React.useState(false);

  if (loading) {
    return (
      <Card className="flex flex-col min-h-[140px] justify-between">
        <h3 className="text-xs text-text-silver font-bold uppercase tracking-wider mb-2">Current Weather</h3>
        <div className="space-y-3">
          <Skeleton variant="text" className="w-1/3 h-8 bg-mid-dark" />
          <div className="flex space-x-4">
            <Skeleton variant="text" className="w-12 h-4 bg-mid-dark" />
            <Skeleton variant="text" className="w-12 h-4 bg-mid-dark" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="flex flex-col min-h-[140px] justify-between">
        <h3 className="text-xs text-text-silver font-bold uppercase tracking-wider mb-2">Current Weather</h3>
        <DataStatus
          status="error"
          title="Weather data unavailable"
          message={error || 'Could not connect to the weather provider.'}
          onRetry={onRetry}
          className="min-h-[100px] p-2 bg-transparent border-none"
        />
      </Card>
    );
  }

  const formatTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const updatedTime = formatTime(weather.retrievedAt || weather.observedAt);

  return (
    <Card className="flex flex-col justify-between hover:bg-dark-card transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs text-text-silver font-bold uppercase tracking-wider">Current Weather</h3>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full select-none ${
              (weather.dataType === 'LIVE' || weather.dataType === 'current/live') ? 'bg-[#1ed760]/20 text-[#1ed760]' :
              (weather.dataType === 'CACHED' || weather.dataType === 'cached') ? 'bg-[#539df5]/20 text-[#539df5]' :
              'bg-[#ffa42b]/20 text-[#ffa42b]'
            }`}>
              {weather.dataType === 'current/live' ? 'LIVE' : weather.dataType === 'cached' ? 'CACHED' : weather.dataType}
            </span>
          </div>
          <span className="text-xs font-sans text-text-silver capitalize">{weather.description}</span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-mid-dark rounded-full text-spotify-green flex items-center justify-center min-w-[40px] min-h-[40px]">
              {weather.icon && !iconError ? (
                <img
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                  alt={weather.description}
                  className="w-8 h-8 object-contain"
                  onError={() => setIconError(true)}
                />
              ) : (
                <Sun size={22} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-title text-text-base leading-tight">
                {formatTemperature(weather.temperature)}
              </span>
              <span className="text-[10px] text-text-silver font-sans select-none">
                Feels like {formatTemperature(weather.feelsLike)}
              </span>
            </div>
          </div>
          <div className="flex space-x-3 text-xs text-text-silver font-sans">
            <div className="flex items-center space-x-1" title="Precipitation">
              <CloudRain size={14} className="text-light-border" />
              <span>{weather.precipitation !== undefined && weather.precipitation !== null ? `${weather.precipitation} mm` : '0 mm'}</span>
            </div>
            <div className="flex items-center space-x-1" title="Humidity">
              <Droplets size={14} className="text-light-border" />
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center space-x-1" title="Wind Speed">
              <Wind size={14} className="text-light-border" />
              <span>{weather.windSpeed} m/s</span>
            </div>
          </div>
        </div>

        {/* Sunrise / Sunset and Updated Time row */}
        {(weather.sunrise || weather.sunset || updatedTime) && (
          <div className="flex items-center justify-between text-[11px] text-text-silver font-sans pt-3 mt-3 border-t border-border-gray/40">
            <div className="flex items-center space-x-3">
              {weather.sunrise && (
                <div className="flex items-center space-x-1" title="Sunrise">
                  <Sunrise size={13} className="text-spotify-green" />
                  <span>{formatTime(weather.sunrise)}</span>
                </div>
              )}
              {weather.sunset && (
                <div className="flex items-center space-x-1" title="Sunset">
                  <Sunset size={13} className="text-light-border" />
                  <span>{formatTime(weather.sunset)}</span>
                </div>
              )}
            </div>
            {updatedTime && (
              <div className="flex items-center space-x-1 text-[10px] text-text-silver/60 font-mono" title="Last updated">
                <Clock size={11} />
                <span>{updatedTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Forecast data strip where supported */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border-gray/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-silver/80">3-Hour Forecast</span>
              <span className="text-[9px] text-text-silver/50">Next 12-15h</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {weather.forecast.slice(0, 4).map((slot, idx) => (
                <div key={idx} className="flex flex-col items-center py-1.5 px-1 rounded bg-mid-dark/60 text-center border border-border-gray/20">
                  <span className="text-[10px] text-text-silver font-mono">{slot.time}</span>
                  {slot.icon ? (
                    <img
                      src={`https://openweathermap.org/img/wn/${slot.icon}.png`}
                      alt={slot.description}
                      className="w-6 h-6 object-contain my-0.5"
                    />
                  ) : (
                    <Sun size={14} className="text-text-silver my-1" />
                  )}
                  <span className="text-xs font-bold text-text-base font-title">{slot.temperature.toFixed(0)}°</span>
                  <span className="text-[9px] text-text-silver/60 truncate max-w-full capitalize px-0.5">
                    {slot.description.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
export default WeatherOverviewCard;

