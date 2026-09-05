import axios from 'axios';
import { env } from '../config/env.js';
import { ClimateData } from '../types/climate.js';
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
}

export class WeatherService {
  /**
   * OpenWeather Adapter - Fetches raw live weather data from OpenWeather API
   * and normalizes it to the unified GeoTwin ClimateData format.
   */
  static async fetchLiveWeather(lat: number, lng: number): Promise<ClimateData> {
    if (!env.OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY is missing/unconfigured.');
    }

    console.log(`[WeatherService] Querying OpenWeather API for (${lat}, ${lng})...`);
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat,
        lon: lng,
        appid: env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 5000,
    });

    const ow = response.data;
    const observedAt = new Date(ow.dt * 1000).toISOString();
    const retrievedAt = new Date().toISOString();

    return {
      latitude: lat,
      longitude: lng,
      observedAt,
      temperature: ow.main.temp,
      feelsLike: ow.main.feels_like,
      humidity: ow.main.humidity,
      pressure: ow.main.pressure,
      precipitation: null, // OpenWeather 2.5 current weather doesn't reliably output annual/daily precipitation in main block
      wind: {
        speed: ow.wind.speed,
        direction: ow.wind.deg || 0,
      },
      source: 'OpenWeather',
      dataType: 'current/live',
      retrievedAt,
      // Backward compatibility fields
      windSpeed: ow.wind.speed,
      windDirection: ow.wind.deg || 0,
      cloudiness: ow.clouds.all || 0,
      description: ow.weather[0]?.description || 'unknown',
      icon: ow.weather[0]?.icon,
    };
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
    };
  }
}
