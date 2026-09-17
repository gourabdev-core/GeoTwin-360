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
        <h3 className="text-xs text-[#8ea39a] font-bold uppercase tracking-wider mb-2">Current Weather</h3>
        <div className="space-y-3">
          <Skeleton variant="text" className="w-1/3 h-8 bg-[#0d1b18]" />
          <div className="flex space-x-4">
            <Skeleton variant="text" className="w-14 h-4 bg-[#0d1b18]" />
            <Skeleton variant="text" className="w-14 h-4 bg-[#0d1b18]" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="flex flex-col min-h-[140px] justify-between">
        <h3 className="text-xs text-[#8ea39a] font-bold uppercase tracking-wider mb-2">Current Weather</h3>
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
    <Card hoverable className="flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center space-x-2.5">
            <h3 className="text-xs text-[#8ea39a] font-bold uppercase tracking-wider">Current Weather</h3>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-md select-none border ${
                weather.dataType === 'LIVE' || weather.dataType === 'current/live'
                  ? 'bg-[#32f26b]/15 text-[#32f26b] border-[#32f26b]/30 shadow-[0_0_8px_rgba(50,242,107,0.15)]'
                  : weather.dataType === 'CACHED' || weather.dataType === 'cached'
                  ? 'bg-[#28a7ff]/15 text-[#28a7ff] border-[#28a7ff]/30'
                  : 'bg-[#ffa42b]/15 text-[#ffa42b] border-[#ffa42b]/30'
              }`}
            >
              {weather.dataType === 'current/live' ? 'LIVE' : weather.dataType === 'cached' ? 'CACHED' : weather.dataType}
            </span>
          </div>
          <span className="text-xs font-sans text-[#c7d4cf] capitalize font-medium">{weather.description}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mt-3 sm:mt-4 gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-[#0d1b18] border border-white/[0.08] rounded-xl text-[#32f26b] flex items-center justify-center min-w-[44px] min-h-[44px] shadow-subtle">
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
              <span className="text-3xl font-bold font-title text-[#f5fff8] leading-tight tracking-tight">
                {formatTemperature(weather.temperature)}
              </span>
              <span className="text-[10px] text-[#8ea39a] font-sans select-none mt-0.5">
                Feels like {formatTemperature(weather.feelsLike)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:gap-3.5 text-xs text-[#8ea39a] font-sans">
            <div className="flex items-center space-x-1.5" title="Precipitation">
              <CloudRain size={14} className="text-[#28a7ff]" />
              <span className="text-[#c7d4cf]">{weather.precipitation !== undefined && weather.precipitation !== null ? `${weather.precipitation} mm` : '0 mm'}</span>
            </div>
            <div className="flex items-center space-x-1.5" title="Humidity">
              <Droplets size={14} className="text-[#19d9c5]" />
              <span className="text-[#c7d4cf]">{weather.humidity}%</span>
            </div>
            <div className="flex items-center space-x-1.5" title="Wind Speed">
              <Wind size={14} className="text-[#8ea39a]" />
              <span className="text-[#c7d4cf]">{weather.windSpeed} m/s</span>
            </div>
          </div>
        </div>

        {/* Sunrise / Sunset and Updated Time row */}
        {(weather.sunrise || weather.sunset || updatedTime) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-[#8ea39a] font-sans pt-3 mt-3.5 border-t border-white/[0.07] gap-2">
            <div className="flex items-center space-x-3.5">
              {weather.sunrise && (
                <div className="flex items-center space-x-1.5" title="Sunrise">
                  <Sunrise size={13} className="text-[#32f26b]" />
                  <span className="text-[#c7d4cf]">{formatTime(weather.sunrise)}</span>
                </div>
              )}
              {weather.sunset && (
                <div className="flex items-center space-x-1.5" title="Sunset">
                  <Sunset size={13} className="text-[#ffa42b]" />
                  <span className="text-[#c7d4cf]">{formatTime(weather.sunset)}</span>
                </div>
              )}
            </div>
            {updatedTime && (
              <div className="flex items-center space-x-1.5 text-[10px] text-[#8ea39a]/70 font-mono" title="Last updated">
                <Clock size={11} />
                <span>{updatedTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Forecast data strip where supported */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8ea39a]">3-Hour Forecast</span>
              <span className="text-[9px] text-[#8ea39a]/60">Next 12-15h</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {weather.forecast.slice(0, 4).map((slot, idx) => (
                <div key={idx} className="flex flex-col items-center py-2 px-1 rounded-xl bg-[#0d1b18] text-center border border-white/[0.06] hover:border-white/10 transition-colors">
                  <span className="text-[10px] text-[#8ea39a] font-mono">{slot.time}</span>
                  {slot.icon ? (
                    <img
                      src={`https://openweathermap.org/img/wn/${slot.icon}.png`}
                      alt={slot.description}
                      className="w-6 h-6 object-contain my-0.5"
                    />
                  ) : (
                    <Sun size={14} className="text-[#8ea39a] my-1" />
                  )}
                  <span className="text-xs font-bold text-[#f5fff8] font-title">{slot.temperature.toFixed(0)}°</span>
                  <span className="text-[9px] text-[#8ea39a] truncate max-w-full capitalize px-0.5">
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
