import { apiClient } from './api.js';
import { ClimateMetrics } from '../types/domain.js';
import { ClimateAnalysisModel, ScenarioType } from '../types/prediction.js';

export interface ClimateOverviewResponse {
  locationId: string;
  year: number;
  scenario?: string;
  dataType: string;
  metrics: ClimateMetrics;
  source?: {
    provider: string;
    updatedAt: string;
  };
}

export interface PredictionDataPoint {
  year: number;
  scenario?: string;
  dataType?: string;
  metrics: {
    temperature?: number | null;
    precipitation?: number | null;
    waterAvailability?: number | null;
    airQualityIndex?: number | null;
    greenCover?: number | null;
    co2Emissions?: number | null;
  };
  metadata?: {
    variable?: string;
    unit?: string;
    modelMethod?: string;
    baselinePeriod?: string;
    sourceData?: string;
    generatedAt?: string;
    confidence?: number | null;
    tempRSquared?: number | null;
    precipRSquared?: number | null;
  };
}

export interface PredictionsResponse {
  locationId: string;
  targetYear?: number;
  scenario?: any;
  analysis?: ClimateAnalysisModel;
  projections: PredictionDataPoint[];
  model?: {
    name: string;
    method?: string;
    source: string;
    baselinePeriod?: string;
    confidence?: number | null;
    disclaimer?: string;
  };
}

export type ClimateIndicatorType =
  | 'temperature'
  | 'precipitation'
  | 'sea_level'
  | 'sea_ice'
  | 'extreme_heat';

export type TimelineStatus =
  | 'OBSERVED'
  | 'CURRENT/YTD'
  | 'PROJECTED'
  | 'MODELLED'
  | 'UNAVAILABLE'
  | 'observed'
  | 'year_to_date'
  | 'projected';

export interface ClimateTimelineDataPoint {
  year: number;
  value: number | null;
  indicator?: ClimateIndicatorType;
  unit?: string;
  status: TimelineStatus;
  source: string;
  methodology?: string;
  baseline: string;
  scenario?: string;
  scope?: 'global' | 'local' | 'regional';
  location?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  updatedAt: string;
  note?: string;
  projectedValue?: number | null;
  projectedPrecip?: number | null;
  confidence?: number | null;
}

export interface ClimateTimelineResponse {
  indicator?: ClimateIndicatorType;
  indicatorName?: string;
  unit?: string;
  scope?: 'global' | 'local' | 'regional';
  source: string;
  sourceUrl: string;
  baseline: string;
  description: string;
  updatedAt: string;
  disclaimer: string;
  latestCompletedYear?: number;
  currentYearStatus?: string;
  timeline: ClimateTimelineDataPoint[];
  projections?: ClimateTimelineDataPoint[];
  combinedTimeline: ClimateTimelineDataPoint[];
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
  async getClimateOverview(locationId: string, year: number, scenario: string = 'default'): Promise<ClimateOverviewResponse> {
    const response = await apiClient.get(`/climate/${locationId}`, {
      params: { year, scenario }
    });
    return response.data.data;
  },

  async getClimateTimeline(
    locationId?: string,
    scenario?: string,
    indicator?: ClimateIndicatorType
  ): Promise<ClimateTimelineResponse> {
    const response = await apiClient.get('/climate/timeline', {
      params: { locationId, scenario, indicator }
    });
    return response.data.data;
  },

  async getHistoricalClimate(locationId: string): Promise<HistoricalClimateResponse> {
    const response = await apiClient.get(`/climate/${locationId}`);
    return response.data.data;
  },

  async getFuturePredictions(
    locationId: string,
    fromYear = 2025,
    toYear = 2050,
    scenario: string = 'default',
    year: number = 2035,
    includeAi = false
  ): Promise<PredictionsResponse> {
    const response = await apiClient.get(`/predictions/${locationId}`, {
      params: { fromYear, toYear, scenario, year, includeAi: includeAi ? 'true' : 'false' }
    });
    return response.data.data;
  },

  async getClimateAnalysis(
    locationId: string,
    year: number = 2035,
    scenario: ScenarioType = 'default',
    includeAi = false
  ): Promise<PredictionsResponse> {
    const response = await apiClient.get(`/predictions/${locationId}`, {
      params: { year, scenario, includeAi: includeAi ? 'true' : 'false' }
    });
    return response.data.data;
  }
};
