import { supabase } from '../config/supabase.js';
import { DatabaseScenario } from '../types/database.js';

export class ScenarioRepository {
  /**
   * Fetch all scenarios created by a user.
   */
  async getUserScenarios(userId: string): Promise<DatabaseScenario[]> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[ScenarioRepository] Error fetching user scenarios:', error.message);
        return [];
      }

      return (data as DatabaseScenario[]) || [];
    } catch (err: any) {
      console.error('[ScenarioRepository] Unexpected error:', err);
      return [];
    }
  }

  /**
   * Fetch a single scenario by ID.
   */
  async getScenarioById(id: string): Promise<DatabaseScenario | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('[ScenarioRepository] Error fetching scenario:', error.message);
        return null;
      }

      return data as DatabaseScenario | null;
    } catch (err: any) {
      console.error('[ScenarioRepository] Unexpected error:', err);
      return null;
    }
  }

  /**
   * Create a new climate scenario.
   */
  async createScenario(
    scenario: Omit<DatabaseScenario, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DatabaseScenario | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .insert(scenario)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseScenario;
    } catch (err: any) {
      console.error('[ScenarioRepository] Error creating scenario:', err);
      throw err;
    }
  }

  /**
   * Update an existing scenario.
   */
  async updateScenario(
    id: string,
    updates: Partial<DatabaseScenario>
  ): Promise<DatabaseScenario | null> {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseScenario;
    } catch (err: any) {
      console.error('[ScenarioRepository] Error updating scenario:', err);
      throw err;
    }
  }

  /**
   * Delete a scenario.
   */
  async deleteScenario(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('[ScenarioRepository] Error deleting scenario:', err);
      throw err;
    }
  }
}

export const scenarioRepository = new ScenarioRepository();
