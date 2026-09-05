import { apiClient } from './api.js';

export interface RiskMetricResponse {
  locationId: string;
  metric: string;
  year: number;
  score: number | null;
  level: string | null;
  dataType: string;
}

export interface RiskMapFeature {
  type: 'Feature';
  geometry: any;
  properties: {
    riskScore: number | null;
    riskLevel: string;
    source?: string;
    metadata?: any;
  };
}

export interface RiskMapResponse {
  metric: string;
  year: number;
  features: RiskMapFeature[];
}

export const riskService = {
  async getRiskSummary(locationId: string, metric: string, year: number): Promise<RiskMetricResponse> {
    const response = await apiClient.get(`/risk/${locationId}`, {
      params: { metric, year }
    });
    return response.data.data;
  },

  async getRiskMapData(locationId: string, metric: string, year: number, params?: Record<string, any>): Promise<RiskMapResponse> {
    const response = await apiClient.get(`/risk/${locationId}/map`, {
      params: { metric, year, ...params }
    });
    return response.data.data;
  }
};
