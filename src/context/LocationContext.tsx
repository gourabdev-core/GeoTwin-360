import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { LocationContext as LocationModel } from '../types/domain.js';

interface LocationContextType {
  selectedLocation: LocationModel | null;
  loading: boolean;
  error: string | null;
  selectLocation: (location: Omit<LocationModel, 'id'>) => Promise<void>;
  clearLocation: () => void;
}

const LocationStateContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initRef = useRef<boolean>(false);

  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');

  // Load location from URL parameters on mount or URL change
  useEffect(() => {
    const loadFromUrl = async () => {
      if (!urlLat || !urlLng) {
        if (selectedLocation) {
          setSelectedLocation(null);
        }
        return;
      }

      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);

      if (isNaN(lat) || isNaN(lng)) {
        setError('Invalid coordinates in URL.');
        return;
      }

      // Skip if already matching current selection
      if (
        selectedLocation &&
        Math.abs(selectedLocation.latitude - lat) < 0.0001 &&
        Math.abs(selectedLocation.longitude - lng) < 0.0001
      ) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Resolve details via reverse geocode
        const revResponse = await apiClient.get('/locations/reverse', {
          params: { lat, lng }
        });
        const resolvedLoc = revResponse.data.data;

        // 2. Persist/get location record in Supabase
        const dbResponse = await apiClient.post('/locations', resolvedLoc);
        setSelectedLocation(dbResponse.data.data);
      } catch (err: any) {
        console.error('[LocationContext] Failed to load location from URL:', err);
        setError(err.message || 'Failed to load selected location.');
        setSelectedLocation(null);
      } finally {
        setLoading(false);
      }
    };

    // Avoid running twice in React StrictMode if already run
    if (!initRef.current || (urlLat !== selectedLocation?.latitude?.toString() || urlLng !== selectedLocation?.longitude?.toString())) {
      initRef.current = true;
      loadFromUrl();
    }
  }, [urlLat, urlLng]);

  const selectLocation = async (locationData: Omit<LocationModel, 'id'>) => {
    setLoading(true);
    setError(null);

    try {
      // Persist in Supabase through backend
      const dbResponse = await apiClient.post('/locations', locationData);
      const finalLocation = dbResponse.data.data;

      setSelectedLocation(finalLocation);

      // Update URL search parameters
      setSearchParams({
        lat: finalLocation?.latitude?.toString() || '',
        lng: finalLocation?.longitude?.toString() || ''
      });
    } catch (err: any) {
      console.error('[LocationContext] Select location failed:', err);
      setError(err.message || 'Failed to select location.');
      setSelectedLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setError(null);
    setSearchParams({});
  };

  return (
    <LocationStateContext.Provider
      value={{
        selectedLocation,
        loading,
        error,
        selectLocation,
        clearLocation
      }}
    >
      {children}
    </LocationStateContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationStateContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
