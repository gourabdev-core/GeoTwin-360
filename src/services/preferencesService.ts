import { apiClient } from './api.js';
import { supabase } from '../config/supabase.js';
import { profileRepository } from '../repositories/profileRepository.js';
import { UserPreferences } from '../types/database.js';

const STORAGE_KEY = 'geotwin_user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  temperatureUnit: 'celsius',
  defaultTargetYear: 2035,
  defaultScenario: 'resilience',
  defaultLocationId: 'loc-22.5726-88.3639',
  defaultLocationName: 'Kolkata, West Bengal, India',
};

export class PreferencesService {
  /**
   * Read cached preferences from LocalStorage
   */
  getLocalPreferences(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
        };
      }
    } catch {
      // Fallback on parse failure
    }
    return DEFAULT_PREFERENCES;
  }

  /**
   * Save preferences to LocalStorage
   */
  setLocalPreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore quota/write errors
    }
  }

  /**
   * Fetch current user preferences, prioritizing backend/Supabase if authenticated
   */
  async getPreferences(): Promise<UserPreferences> {
    const local = this.getLocalPreferences();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return local;
      }

      // Try API first if authenticated
      try {
        const response = await apiClient.get('/profile');
        if (response.data?.data?.preferences) {
          const cloudPrefs = {
            ...local,
            ...response.data.data.preferences,
          };
          this.setLocalPreferences(cloudPrefs);
          return cloudPrefs;
        }
      } catch (err: any) {
        if (err?.code === 'UNAUTHORIZED' || err?.response?.status === 401) {
          // Unauthenticated or expired session - gracefully return local preferences without fallback spam
          return local;
        }
        // Fallback to Supabase direct query for authenticated users
        const profile = await profileRepository.getProfile(session.user.id);
        if (profile?.preferences) {
          const cloudPrefs = {
            ...local,
            ...profile.preferences,
          };
          this.setLocalPreferences(cloudPrefs);
          return cloudPrefs;
        }
      }
    } catch (err) {
      console.warn('[PreferencesService] Failed to fetch remote preferences:', err);
    }

    return local;
  }

  /**
   * Persist user preferences to both local storage and Supabase (if authenticated)
   */
  async savePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = this.getLocalPreferences();
    const merged: UserPreferences = {
      ...current,
      ...updates,
    };

    // 1. Immediately persist locally
    this.setLocalPreferences(merged);

    // 2. Persist to cloud if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          await apiClient.patch('/profile', { preferences: merged });
        } catch {
          // Direct Supabase fallback
          await profileRepository.updatePreferences(session.user.id, merged);
        }
      }
    } catch (err) {
      console.warn('[PreferencesService] Cloud sync failed for preferences:', err);
    }

    return merged;
  }
}

export const preferencesService = new PreferencesService();
