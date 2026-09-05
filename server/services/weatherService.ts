import axios from 'axios';
import { env } from '../config/env.js';
import { ClimateData, WeatherForecastPoint } from '../types/climate.js';
import { ClimateService } from './climateService.js';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  description: string;
  observedAt: string;
  source: string;
  dataType: 'LIVE' | 'CACHED' | 'FALLBACK';
  retrievedAt: string;
  icon?: string;
  aqi?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: WeatherForecastPoint[];
}

interface WeatherMemoryCacheEntry {
  data: ClimateData;
  cachedAt: number;
}

const memoryCache = new Map<string, WeatherMemoryCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export class WeatherService {
  /**
   * Helper to format cache key
   */
  private static getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  /**
   * OpenWeather Adapter - Fetches raw live weather data and forecast from OpenWeather API
   * and normalizes it to the unified GeoTwin ClimateData format.
   */
  static async fetchLiveWeather(lat: number, lng: number): Promise<ClimateData> {
    if (!env.OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY is missing/unconfigured.');
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
      console.log(`[WeatherService] In-memory cache hit for key: ${cacheKey}`);
      return {
        ...cached.data,
        dataType: 'cached',
        retrievedAt: new Date(cached.cachedAt).toISOString(),
      };
    }

    console.log(`[WeatherService] Querying OpenWeather API for (${lat}, ${lng})...`);
    
    // Concurrently fetch current weather and forecast
    const [currentRes, forecastRes] = await Promise.allSettled([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat,
          lon: lng,
          appid: env.OPENWEATHER_API_KEY,
          units: 'metric',
        },
        timeout: 6000,
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat,
          lon: lng,
          appid: env.OPENWEATHER_API_KEY,
          units: 'metric',
        },
        timeout: 6000,
      }),
    ]);

    if (currentRes.status === 'rejected') {
      throw currentRes.reason;
    }

    const ow = currentRes.value.data;
    const observedAt = new Date(ow.dt * 1000).toISOString();
    const retrievedAt = new Date().toISOString();

    // Parse sunrise and sunset where available
    const sunrise = ow.sys?.sunrise ? new Date(ow.sys.sunrise * 1000).toISOString() : undefined;
    const sunset = ow.sys?.sunset ? new Date(ow.sys.sunset * 1000).toISOString() : undefined;

    // Parse forecast data where supported
    let forecast: WeatherForecastPoint[] = [];
    if (forecastRes.status === 'fulfilled' && forecastRes.value?.data?.list) {
      const list = forecastRes.value.data.list;
      forecast = list.slice(0, 5).map((item: any) => {
        const itemDate = new Date(item.dt * 1000);
        return {
          timestamp: itemDate.toISOString(),
          time: itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: Math.round(item.main.temp * 10) / 10,
          feelsLike: Math.round(item.main.feels_like * 10) / 10,
          humidity: item.main.humidity,
          description: item.weather?.[0]?.description || 'Clear',
          icon: item.weather?.[0]?.icon,
          windSpeed: item.wind?.speed || 0,
        };
      });
    }

    const climateResult: ClimateData = {
      latitude: lat,
      longitude: lng,
      observedAt,
      temperature: ow.main.temp,
      feelsLike: ow.main.feels_like,
      humidity: ow.main.humidity,
      pressure: ow.main.pressure,
      precipitation: null,
      wind: {
        speed: ow.wind.speed,
        direction: ow.wind.deg || 0,
      },
      source: 'OpenWeather',
      dataType: 'current/live',
      retrievedAt,
      // Weather & forecast extensions
      windSpeed: ow.wind.speed,
      windDirection: ow.wind.deg || 0,
      cloudiness: ow.clouds?.all || 0,
      description: ow.weather?.[0]?.description || 'unknown',
      icon: ow.weather?.[0]?.icon,
      sunrise,
      sunset,
      forecast,
    };

    // Store in memory cache
    memoryCache.set(cacheKey, {
      data: climateResult,
      cachedAt: Date.now(),
    });

    return climateResult;
  }

  /**
   * For backwards compatibility. Delegates to the unified ClimateService,
   * then maps unified dataType values back to M4 specific values for caller/test assertions.
   */
  static async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const climate = await ClimateService.getCurrentClimate(lat, lng);

    let compatDataType: 'LIVE' | 'CACHED' | 'FALLBACK' = 'LIVE';
    if (climate.dataType === 'current/live') {
      compatDataType = 'LIVE';
    } else if (climate.dataType === 'cached') {
      compatDataType = 'CACHED';
    } else {
      compatDataType = 'FALLBACK';
    }

    return {
      temperature: climate.temperature ?? 0,
      feelsLike: climate.feelsLike ?? 0,
      humidity: climate.humidity ?? 0,
      pressure: climate.pressure ?? 1013,
      windSpeed: climate.wind?.speed ?? climate.windSpeed ?? 0,
      windDirection: climate.wind?.direction ?? climate.windDirection ?? 0,
      cloudiness: climate.cloudiness ?? 0,
      description: climate.description ?? 'unknown',
      observedAt: climate.observedAt,
      source: climate.source,
      dataType: compatDataType,
      retrievedAt: climate.retrievedAt,
      icon: climate.icon,
      aqi: climate.aqi,
      sunrise: climate.sunrise,
      sunset: climate.sunset,
      forecast: climate.forecast,
    };
  }
}

