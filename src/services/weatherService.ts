import { apiClient } from './api.js';
import { WeatherData } from '../types/domain.js';

export const weatherService = {
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const response = await apiClient.get('/weather', {
      params: { lat, lng }
    });
    return response.data.data;
  }
};
