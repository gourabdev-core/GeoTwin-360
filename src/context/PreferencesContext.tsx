import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserPreferences } from '../types/database.js';
import { preferencesService } from '../services/preferencesService.js';
import { useAuth } from './AuthContext.js';

interface PreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saved' | 'error';
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  formatTemperature: (celsiusVal: number | null | undefined, precision?: number) => string;
  temperatureUnitSymbol: string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    preferencesService.getLocalPreferences()
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load preferences on initialization or when auth profile updates
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (profile?.preferences) {
          const merged = {
            ...preferencesService.getLocalPreferences(),
            ...profile.preferences,
          };
          if (isMounted) {
            setPreferences(merged);
            preferencesService.setLocalPreferences(merged);
          }
        } else {
          const loaded = await preferencesService.getPreferences();
          if (isMounted) {
            setPreferences(loaded);
          }
        }
      } catch (err) {
        console.warn('[PreferencesContext] Error loading preferences:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [user, profile]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>): Promise<boolean> => {
      setIsSaving(true);
      setSaveStatus('idle');

      try {
        const saved = await preferencesService.savePreferences(updates);
        setPreferences(saved);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return true;
      } catch (err) {
        console.error('[PreferencesContext] Failed to save preferences:', err);
        setSaveStatus('error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const formatTemperature = useCallback(
    (celsiusVal: number | null | undefined, precision: number = 1): string => {
      if (celsiusVal === null || celsiusVal === undefined || isNaN(celsiusVal)) {
        return 'N/A';
      }

      if (preferences.temperatureUnit === 'fahrenheit') {
        const fahrenheit = (celsiusVal * 9) / 5 + 32;
        return `${fahrenheit.toFixed(precision)}°F`;
      }

      return `${celsiusVal.toFixed(precision)}°C`;
    },
    [preferences.temperatureUnit]
  );

  const temperatureUnitSymbol = preferences.temperatureUnit === 'fahrenheit' ? '°F' : '°C';

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        isSaving,
        saveStatus,
        updatePreferences,
        formatTemperature,
        temperatureUnitSymbol,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
