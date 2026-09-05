import { supabase } from '../config/supabase.js';
import { DatabaseLocation } from '../types/database.js';

export class LocationRepository {
  /**
   * Get all registered locations.
   */
  async getLocations(limit: number = 20): Promise<DatabaseLocation[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        console.warn('[LocationRepository] Failed to fetch locations:', error.message);
        return [];
      }

      return (data as DatabaseLocation[]) || [];
    } catch (err: any) {
      console.error('[LocationRepository] Unexpected error:', err);
      return [];
    }
  }

  /**
   * Get location by ID.
   */
  async getLocationById(id: string): Promise<DatabaseLocation | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('[LocationRepository] Failed to get location by ID:', error.message);
        return null;
      }

      return data as DatabaseLocation | null;
    } catch (err: any) {
      console.error('[LocationRepository] Unexpected error:', err);
      return null;
    }
  }

  /**
   * Find a location matching latitude and longitude within threshold.
   */
  async findLocationByCoordinates(lat: number, lng: number, threshold: number = 0.01): Promise<DatabaseLocation | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .gte('latitude', lat - threshold)
        .lte('latitude', lat + threshold)
        .gte('longitude', lng - threshold)
        .lte('longitude', lng + threshold)
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data as DatabaseLocation | null;
    } catch {
      return null;
    }
  }

  /**
   * Insert or create a new location.
   */
  async createLocation(location: Omit<DatabaseLocation, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseLocation | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseLocation;
    } catch (err: any) {
      console.error('[LocationRepository] Failed to create location:', err);
      throw err;
    }
  }
}

export const locationRepository = new LocationRepository();
