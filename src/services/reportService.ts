import { apiClient } from './api.js';
import { generateClientPdfBlob } from '../utils/clientPdfGenerator.js';
import { DatabaseSavedReport, SavedReportMetadata } from '../types/database.js';
import { reportRepository } from '../repositories/reportRepository.js';
import { supabase } from '../config/supabase.js';

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

export interface SaveReportPayload {
  title: string;
  locationId?: string | null;
  scenarioId?: string | null;
  summary?: string | null;
  fileUrl?: string | null;
  metadata: SavedReportMetadata;
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

  // =========================================================================
  // SAVED REPORTS (Authenticated User Management)
  // =========================================================================

  /**
   * Fetch all saved reports for the authenticated user.
   */
  async getSavedReports(): Promise<DatabaseSavedReport[]> {
    try {
      const response = await apiClient.get('/reports/saved');
      return response.data.data || [];
    } catch (err: any) {
      console.warn('[ReportService] API getSavedReports failed, falling back to repository:', err.message);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return await reportRepository.getUserSavedReports(session.user.id);
      }
      return [];
    }
  },

  /**
   * Fetch a single saved report by ID.
   */
  async getSavedReport(id: string): Promise<DatabaseSavedReport> {
    try {
      const response = await apiClient.get(`/reports/saved/${id}`);
      return response.data.data;
    } catch (err: any) {
      console.warn('[ReportService] API getSavedReport failed, falling back to repository:', err.message);
      const report = await reportRepository.getSavedReportById(id);
      if (!report) {
        throw new Error('Report not found or access denied.');
      }
      return report;
    }
  },

  /**
   * Save a climate report to the database for the authenticated user.
   */
  async saveReport(payload: SaveReportPayload): Promise<DatabaseSavedReport> {
    try {
      const response = await apiClient.post('/reports/saved', payload);
      return response.data.data;
    } catch (err: any) {
      console.warn('[ReportService] API saveReport failed, falling back to repository:', err.message);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You must be signed in to save reports.');
      }

      const report = await reportRepository.saveReport({
        user_id: session.user.id,
        location_id: payload.locationId || null,
        scenario_id: payload.scenarioId || null,
        title: payload.title,
        summary: payload.summary || payload.metadata.aiSummary || null,
        status: 'READY',
        file_url: payload.fileUrl || null,
        metadata: payload.metadata,
      });

      if (!report) {
        throw new Error('Failed to save report to database.');
      }
      return report;
    }
  },

  /**
   * Rename an existing saved report.
   */
  async renameSavedReport(id: string, title: string): Promise<DatabaseSavedReport> {
    try {
      const response = await apiClient.patch(`/reports/saved/${id}`, { title });
      return response.data.data;
    } catch (err: any) {
      console.warn('[ReportService] API renameSavedReport failed, falling back to repository:', err.message);
      const updated = await reportRepository.updateReportTitle(id, title);
      if (!updated) {
        throw new Error('Failed to rename report.');
      }
      return updated;
    }
  },

  /**
   * Delete a saved report.
   */
  async deleteSavedReport(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reports/saved/${id}`);
    } catch (err: any) {
      console.warn('[ReportService] API deleteSavedReport failed, falling back to repository:', err.message);
      await reportRepository.deleteSavedReport(id);
    }
  },
};
