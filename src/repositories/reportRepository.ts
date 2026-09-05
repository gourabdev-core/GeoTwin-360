import { supabase } from '../config/supabase.js';
import { DatabaseSavedReport } from '../types/database.js';

export class ReportRepository {
  /**
   * Fetch all saved reports for an authenticated user.
   */
  async getUserSavedReports(userId: string): Promise<DatabaseSavedReport[]> {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[ReportRepository] Error fetching saved reports:', error.message);
        return [];
      }

      return (data as DatabaseSavedReport[]) || [];
    } catch (err: any) {
      console.error('[ReportRepository] Unexpected error:', err);
      return [];
    }
  }

  /**
   * Get a saved report by ID.
   */
  async getSavedReportById(id: string): Promise<DatabaseSavedReport | null> {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('[ReportRepository] Error fetching report:', error.message);
        return null;
      }

      return data as DatabaseSavedReport | null;
    } catch (err: any) {
      console.error('[ReportRepository] Unexpected error:', err);
      return null;
    }
  }

  /**
   * Save a report to the database.
   */
  async saveReport(
    report: Omit<DatabaseSavedReport, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DatabaseSavedReport | null> {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .insert(report)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseSavedReport;
    } catch (err: any) {
      console.error('[ReportRepository] Error saving report:', err);
      throw err;
    }
  }

  /**
   * Update report title (rename report).
   */
  async updateReportTitle(id: string, title: string): Promise<DatabaseSavedReport | null> {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseSavedReport;
    } catch (err: any) {
      console.error('[ReportRepository] Error updating report title:', err);
      throw err;
    }
  }

  /**
   * Delete a saved report.
   */
  async deleteSavedReport(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('[ReportRepository] Error deleting report:', err);
      throw err;
    }
  }
}

export const reportRepository = new ReportRepository();
