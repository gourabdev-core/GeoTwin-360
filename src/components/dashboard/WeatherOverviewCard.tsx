import React from 'react';
import { Sun, Wind, Droplets } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Skeleton } from '../ui/Skeleton.js';
import { DataStatus } from '../ui/DataStatus.js';
import { WeatherData } from '../../types/domain.js';

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

  return (
    <Card className="flex flex-col min-h-[140px] justify-between hover:bg-dark-card transition-colors duration-200">
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
          <div className="p-2 bg-mid-dark rounded-full text-spotify-green">
            <Sun size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-title text-text-base leading-tight">
              {weather.temperature.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-text-silver font-sans select-none">
              Feels like {weather.feelsLike.toFixed(1)}°C
            </span>
          </div>
        </div>
        <div className="flex space-x-4 text-xs text-text-silver font-sans">
          <div className="flex items-center space-x-1">
            <Droplets size={14} className="text-light-border" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Wind size={14} className="text-light-border" />
            <span>{weather.windSpeed} m/s</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
export default WeatherOverviewCard;
