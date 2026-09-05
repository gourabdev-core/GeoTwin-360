import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from './LocationContext.js';
import { weatherService } from '../services/weatherService.js';
import { WeatherData } from '../types/domain.js';

export type WeatherStatus = 'LOADING' | 'AVAILABLE' | 'UNAVAILABLE';

interface WeatherContextType {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  status: WeatherStatus;
  refreshWeather: () => Promise<void>;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes client cache

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedLocation } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('UNAVAILABLE');

  const clientCacheRef = useRef<Map<string, { data: WeatherData; timestamp: number }>>(new Map());
  const activeReqIdRef = useRef<number>(0);

  const fetchWeatherForLocation = useCallback(async (lat: number, lng: number, forceRefresh: boolean = false) => {
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const now = Date.now();
    const cached = clientCacheRef.current.get(cacheKey);

    if (!forceRefresh && cached && (now - cached.timestamp < CLIENT_CACHE_TTL_MS)) {
      setWeather(cached.data);
      setStatus('AVAILABLE');
      setError(null);
      setLoading(false);
      return;
    }

    const reqId = ++activeReqIdRef.current;
    setLoading(true);
    setStatus('LOADING');
    setError(null);

    try {
      const data = await weatherService.getCurrentWeather(lat, lng);
      if (reqId === activeReqIdRef.current) {
        setWeather(data);
        setStatus('AVAILABLE');
        setError(null);
        clientCacheRef.current.set(cacheKey, { data, timestamp: Date.now() });
      }
    } catch (err: any) {
      if (reqId === activeReqIdRef.current) {
        console.error('[WeatherContext] Failed to fetch live weather:', err.message || err);
        setWeather(null);
        setStatus('UNAVAILABLE');
        setError(err.message || 'Weather data unavailable');
      }
    } finally {
      if (reqId === activeReqIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Automatically update weather whenever the selected location changes
  useEffect(() => {
    if (!selectedLocation || typeof selectedLocation.latitude !== 'number' || typeof selectedLocation.longitude !== 'number') {
      setWeather(null);
      setStatus('UNAVAILABLE');
      setError(null);
      setLoading(false);
      return;
    }

    const { latitude, longitude } = selectedLocation;
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setWeather(null);
      setStatus('UNAVAILABLE');
      setError('Invalid coordinates');
      setLoading(false);
      return;
    }

    fetchWeatherForLocation(latitude, longitude);
  }, [selectedLocation, fetchWeatherForLocation]);

  const refreshWeather = useCallback(async () => {
    if (selectedLocation?.latitude !== undefined && selectedLocation?.longitude !== undefined) {
      await fetchWeatherForLocation(selectedLocation.latitude, selectedLocation.longitude, true);
    }
  }, [selectedLocation, fetchWeatherForLocation]);

  return (
    <WeatherContext.Provider
      value={{
        weather,
        loading,
        error,
        status,
        refreshWeather,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = (): WeatherContextType => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};
