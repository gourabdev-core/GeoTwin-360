import { supabase } from '../config/supabase.js';
import { DatabaseProfile } from '../types/database.js';

export class ProfileRepository {
  /**
   * Fetch a user profile by auth ID.
   */
  async getProfile(userId: string): Promise<DatabaseProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // If profiles table isn't accessible or is empty, try fallback to users table
        console.warn('[ProfileRepository] profiles query returned notice:', error.message);
        return this.getLegacyUserProfile(userId);
      }

      return data as DatabaseProfile | null;
    } catch (err: any) {
      console.error('[ProfileRepository] Failed to fetch profile:', err);
      return null;
    }
  }

  /**
   * Fallback to public.users table if profiles table is not yet migrated.
   */
  private async getLegacyUserProfile(userId: string): Promise<DatabaseProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        full_name: data.name || '',
        email: data.email || '',
        avatar_url: data.avatar_url || null,
        role: data.role || 'Sustainability Lead',
        organization: null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update profile fields for an authenticated user.
   */
  async updateProfile(userId: string, updates: Partial<DatabaseProfile>): Promise<DatabaseProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseProfile;
    } catch (err: any) {
      console.error('[ProfileRepository] Failed to update profile:', err);
      throw err;
    }
  }

  /**
   * Upsert a user profile.
   */
  async upsertProfile(profile: Partial<DatabaseProfile> & { id: string }): Promise<DatabaseProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            ...profile,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DatabaseProfile;
    } catch (err: any) {
      console.error('[ProfileRepository] Failed to upsert profile:', err);
      throw err;
    }
  }

  /**
   * Update specific user preferences for an authenticated user.
   */
  async updatePreferences(userId: string, preferences: Partial<DatabaseProfile['preferences']>): Promise<DatabaseProfile | null> {
    try {
      const currentProfile = await this.getProfile(userId);
      const updatedPreferences = {
        ...(currentProfile?.preferences || {}),
        ...preferences,
      };

      return await this.updateProfile(userId, {
        preferences: updatedPreferences as any,
      });
    } catch (err: any) {
      console.warn('[ProfileRepository] Failed to update preferences in database:', err.message || err);
      return null;
    }
  }
}

export const profileRepository = new ProfileRepository();
