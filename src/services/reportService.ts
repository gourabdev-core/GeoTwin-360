import { apiClient } from './api.js';
import { generateClientPdfBlob } from '../utils/clientPdfGenerator.js';

export interface ReportGenerationResponse {
  reportId: string;
  status: string;
  downloadUrl: string;
}

export interface ReportRecord {
  id: string;
  user_id: string;
  location_id: string;
  scenario_id: string;
  simulation_run_id: string;
  title: string;
  status: string;
  file_url: string;
  storage_key: string;
  generated_at: string;
  expires_at: string;
  created_at: string;
  locations?: {
    name: string;
    city?: string;
    region?: string;
    country: string;
  };
}

export const reportService = {
  async generateReport(
    locationId: string,
    simulationId?: string,
    targetYear?: number,
    clientState?: Record<string, any>
  ): Promise<ReportGenerationResponse> {
    try {
      const response = await apiClient.post('/reports', {
        locationId,
        simulationId,
        targetYear,
        clientState,
      });
      return response.data.data;
    } catch (err: any) {
      console.warn('[ReportService] Backend API connection unreachable. Compiling local report from active dashboard state...', err.message);

      // Fallback: Compile PDF directly client-side from active dashboard state/props
      const pdfBlob = generateClientPdfBlob({
        locationName: clientState?.locationName || 'Selected Location',
        country: clientState?.country || 'Region',
        latitude: clientState?.latitude ?? 0,
        longitude: clientState?.longitude ?? 0,
        targetYear: targetYear || 2035,
        reportDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
        currentTemperature: clientState?.currentTemperature,
        currentHumidity: clientState?.currentHumidity,
        currentWindSpeed: clientState?.currentWindSpeed,
        currentDescription: clientState?.currentDescription,
        currentAqi: clientState?.currentAqi,
        projectedTemperature: clientState?.projectedTemperature,
        projectedPrecipitation: clientState?.projectedPrecipitation,
        heatRiskLevel: clientState?.heatRiskLevel,
        floodRiskLevel: clientState?.floodRiskLevel,
        sustainabilityScoreBefore: clientState?.sustainabilityScoreBefore,
        sustainabilityScoreAfter: clientState?.sustainabilityScoreAfter,
        sustainabilityScoreImprovement: clientState?.sustainabilityScoreImprovement,
      });

      const blobUrl = URL.createObjectURL(pdfBlob);

      return {
        reportId: 'local-' + Date.now(),
        status: 'READY',
        downloadUrl: blobUrl,
      };
    }
  },

  async getReports(): Promise<ReportRecord[]> {
    try {
      const response = await apiClient.get('/reports');
      return response.data.data;
    } catch (err) {
      return [];
    }
  },

  async getReport(id: string): Promise<ReportRecord> {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data.data;
  },
};
