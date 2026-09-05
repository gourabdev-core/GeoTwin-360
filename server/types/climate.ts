export interface GeoTwinLocation {
  id?: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country: string;
  countryCode?: string | null;
  latitude: number;
  longitude: number;
}

export interface WeatherForecastPoint {
  timestamp: string;
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon?: string;
  windSpeed: number;
}

export interface ClimateData {
  location?: GeoTwinLocation;
  latitude: number;
  longitude: number;
  observedAt: string;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  pressure: number | null;
  precipitation: number | null; // rainfall/precipitation
  wind: {
    speed: number | null;
    direction: number | null;
  } | null;
  source: string;
  dataType: 'current/live' | 'cached' | 'historical' | 'projected' | 'simulated' | 'fallback';
  retrievedAt: string;

  // Backward compatibility & extended weather fields
  windSpeed?: number;
  windDirection?: number;
  cloudiness?: number;
  description?: string;
  icon?: string;
  aqi?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: WeatherForecastPoint[];

  // Backward compatibility fields for NASA POWER (M5)
  year?: number;
}

