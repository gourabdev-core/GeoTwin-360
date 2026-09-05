import { apiClient } from './api.js';
import { ClimateMetrics } from '../types/domain.js';

export interface ClimateOverviewResponse {
  locationId: string;
  year: number;
  dataType: string;
  metrics: ClimateMetrics;
  source?: {
    provider: string;
    updatedAt: string;
  };
}

export interface PredictionDataPoint {
  year: number;
  metrics: {
    temperature?: number;
    waterAvailability?: number;
    airQualityIndex?: number;
    greenCover?: number;
    co2Emissions?: number;
  };
}

export interface PredictionsResponse {
  locationId: string;
  projections: PredictionDataPoint[];
  model?: {
    name: string;
    source: string;
    confidence?: number | null;
  };
}

export interface HistoricalClimateDataPoint {
  year: number;
  temperature: number | null;
  precipitation: number | null;
}

export interface HistoricalClimateResponse {
  locationId: string;
  history: HistoricalClimateDataPoint[];
}

export const climateService = {
  async getClimateOverview(locationId: string, year: number): Promise<ClimateOverviewResponse> {
    const response = await apiClient.get(`/climate/${locationId}`, {
      params: { year }
    });
    return response.data.data;
  },

  async getHistoricalClimate(locationId: string): Promise<HistoricalClimateResponse> {
    const response = await apiClient.get(`/climate/${locationId}`);
    return response.data.data;
  },

  async getFuturePredictions(locationId: string, fromYear = 2025, toYear = 2050): Promise<PredictionsResponse> {
    const response = await apiClient.get(`/predictions/${locationId}`, {
      params: { fromYear, toYear }
    });
    return response.data.data;
  }
};
