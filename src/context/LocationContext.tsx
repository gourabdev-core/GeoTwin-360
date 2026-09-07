import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LocationService } from '../services/locationService.js';
import { LocationContext as LocationModel } from '../types/domain.js';

const STORAGE_KEY = 'geotwin_selected_location';

export const DEFAULT_LOCATION: LocationModel = {
  id: 'loc-22.5726-88.3639',
  name: 'Kolkata, West Bengal, India',
  city: 'Kolkata',
  region: 'West Bengal',
  state: 'West Bengal',
  country: 'India',
  countryCode: 'IN',
  latitude: 22.572646,
  longitude: 88.363895,
  displayName: 'Kolkata, West Bengal, India',
};

interface LocationContextType {
  selectedLocation: LocationModel | null;
  loading: boolean;
  error: string | null;
  selectLocation: (location: Omit<LocationModel, 'id'> & { id?: string }) => Promise<void>;
  clearLocation: () => void;
  formatLocationName: (location?: { name: string; region?: string; state?: string; country?: string; displayName?: string } | null) => string;
}

const LocationStateContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlName = searchParams.get('name');

  const formatLocationName = useCallback((loc?: { name?: string; city?: string; region?: string; state?: string; country?: string; displayName?: string } | null): string => {
    if (!loc) return '';
    if (loc.displayName) {
      const parts = loc.displayName.split(',').map(p => p.trim()).filter(Boolean);
      const unique = parts.filter((val, idx) => parts.indexOf(val) === idx);
      return unique.join(', ');
    }
    const stateName = loc.state || loc.region;
    const parts: string[] = [];
    if (loc.name) {
      loc.name.split(',').forEach(p => {
        const trimmed = p.trim();
        if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
      });
    }
    if (stateName && !parts.includes(stateName)) parts.push(stateName);
    if (loc.country && !parts.includes(loc.country)) parts.push(loc.country);
    return parts.join(', ');
  }, []);

  // Sync selected location with local storage & URL
  const applyLocation = useCallback((loc: LocationModel, updateUrl: boolean = true) => {
    setSelectedLocation(loc);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Ignore local storage write errors
    }

    if (updateUrl) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('lat', loc.latitude.toFixed(6));
          next.set('lng', loc.longitude.toFixed(6));
          if (loc.displayName && !loc.displayName.startsWith('Location (')) {
            next.set('name', loc.displayName);
          } else if (loc.name && !loc.name.startsWith('Location (')) {
            next.set('name', loc.name);
          }
          return next;
        },
        { replace: true }
      );
    }
  }, [setSearchParams]);

  // Initial load: URL query only -> No default fallback
  useEffect(() => {
    const initializeLocation = async () => {
      // Case 1: Coordinates provided in URL (Authoritative)
      if (urlLat && urlLng) {
        const lat = parseFloat(urlLat);
        const lng = parseFloat(urlLng);

        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          if (
            selectedLocation &&
            Math.abs(selectedLocation.latitude - lat) < 0.0001 &&
            Math.abs(selectedLocation.longitude - lng) < 0.0001
          ) {
            setLoading(false);
            return;
          }

          // Check if localStorage already has full metadata for these coordinates
          let matchedStored: LocationModel | null = null;
          try {
            const rawStored = localStorage.getItem(STORAGE_KEY);
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (
                parsed &&
                typeof parsed.latitude === 'number' &&
                typeof parsed.longitude === 'number' &&
                Math.abs(parsed.latitude - lat) < 0.001 &&
                Math.abs(parsed.longitude - lng) < 0.001
              ) {
                matchedStored = parsed;
              }
            }
          } catch {
            // Ignore parse errors
          }

          if (matchedStored && matchedStored.country && matchedStored.country !== 'Unknown') {
            applyLocation(matchedStored, false);
            setLoading(false);
            return;
          }

          const nameParts = urlName ? urlName.split(',').map((p) => p.trim()).filter(Boolean) : [];
          const fallbackCity = nameParts[0] || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          const fallbackState = nameParts.length > 2 ? nameParts[1] : undefined;
          const fallbackCountry = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Unknown';

          const immediateLocation: LocationModel = {
            id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: fallbackCity,
            city: fallbackCity,
            region: fallbackState,
            state: fallbackState,
            latitude: lat,
            longitude: lng,
            country: fallbackCountry,
            displayName: urlName || `${fallbackCity}${fallbackCountry !== 'Unknown' ? `, ${fallbackCountry}` : ''}`,
          };

          applyLocation(immediateLocation, false);
          setLoading(false);

          // If display name was generic coordinates or state/country is incomplete, reverse geocode to enrich
          if (!immediateLocation.state || immediateLocation.country === 'Unknown' || !urlName) {
            try {
              const suggestion = await LocationService.reverseGeocode(lat, lng);
              if (suggestion) {
                const stateName = suggestion.state || suggestion.region;
                const displayName =
                  suggestion.displayName ||
                  [suggestion.name, stateName, suggestion.country]
                    .filter(Boolean)
                    .filter((val, idx, arr) => arr.indexOf(val) === idx)
                    .join(', ');
                const enriched: LocationModel = {
                  ...immediateLocation,
                  name: suggestion.name,
                  city: suggestion.city || suggestion.name,
                  region: stateName,
                  state: stateName,
                  country: suggestion.country,
                  countryCode: suggestion.countryCode,
                  displayName,
                };
                applyLocation(enriched, false);

                // Save in background
                LocationService.getOrCreateLocation(enriched).catch(() => null);
              }
            } catch {
              // Retain immediate location
            }
          }
          return;
        }
      }

      // Case 2: No coordinates in URL -> check in-memory state or local storage
      if (selectedLocation) {
        applyLocation(selectedLocation, true);
        setLoading(false);
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            applyLocation(parsed, true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore parsing errors
      }

      setSelectedLocation(null);
      setError(null);
      setLoading(false);
    };

    initializeLocation();
  }, [urlLat, urlLng, urlName, applyLocation]);

  /**
   * Select and persist a location chosen by the user.
   */
  const selectLocation = async (locationData: Omit<LocationModel, 'id'> & { id?: string }) => {
    setLoading(true);
    setError(null);

    const detId = locationData.id || `loc-${locationData.latitude.toFixed(4)}-${locationData.longitude.toFixed(4)}`;
    const stateName = locationData.state || locationData.region;
    
    // Clean, canonical single name and single displayName
    const baseName = locationData.name.split(',')[0].trim();
    const rawDisplayName = locationData.displayName || [baseName, stateName, locationData.country].filter(Boolean).join(', ');
    const parts = rawDisplayName.split(',').map(p => p.trim()).filter(Boolean);
    const displayName = parts.filter((val, idx) => parts.indexOf(val) === idx).join(', ');

    const immediateLoc: LocationModel = {
      id: detId,
      name: baseName,
      city: locationData.city ? locationData.city.split(',')[0].trim() : baseName,
      region: stateName,
      state: stateName,
      country: locationData.country,
      countryCode: locationData.countryCode,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timezone: locationData.timezone,
      displayName,
    };

    // Immediately update global state & URL so map, weather, overview, timeline, risk update without delay
    applyLocation(immediateLoc, true);
    setLoading(false);

    // Save in background if possible
    try {
      await LocationService.getOrCreateLocation(immediateLoc);
    } catch {
      // Ignored
    }
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('lat');
        next.delete('lng');
        next.delete('name');
        return next;
      },
      { replace: true }
    );
  };

  return (
    <LocationStateContext.Provider
      value={{
        selectedLocation,
        loading,
        error,
        selectLocation,
        clearLocation,
        formatLocationName,
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
