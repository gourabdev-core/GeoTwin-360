import { apiClient } from './api.js';
import { LocationContext } from '../types/domain.js';

export interface LocationSuggestion {
  id?: string;
  name: string;
  city?: string;
  region?: string;
  state?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  displayName?: string;
}

export class LocationService {
  // In-memory cache to prevent excessive/duplicate API requests
  private static searchCache = new Map<string, { data: LocationSuggestion[]; timestamp: number }>();
  private static CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache

  /**
   * Search for locations matching a query string with caching and cancellation.
   */
  static async searchLocations(
    query: string,
    limit: number = 5,
    signal?: AbortSignal
  ): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const cacheKey = `${trimmed.toLowerCase()}__${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const response = await apiClient.get<{ data: LocationSuggestion[] }>('/locations/search', {
        params: { q: trimmed, limit },
        signal,
      });

      const raw = response.data?.data || [];
      const results = raw.map(item => {
        const stateName = item.state || item.region;
        const displayName = item.displayName || [item.name, stateName, item.country].filter(Boolean).join(', ');
        return {
          ...item,
          region: stateName,
          state: stateName,
          displayName,
        };
      });
      this.searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    } catch (err: any) {
      // Allow caller to distinguish cancellation
      throw err;
    }
  }

  /**
   * Reverse geocode a latitude/longitude pair into location details.
   */
  static async reverseGeocode(
    lat: number,
    lng: number,
    signal?: AbortSignal
  ): Promise<LocationSuggestion> {
    const response = await apiClient.get<{ data: LocationSuggestion }>('/locations/reverse', {
      params: { lat, lng },
      signal,
    });
    return response.data.data;
  }

  /**
   * Persist or retrieve an existing location from the backend / database.
   */
  static async getOrCreateLocation(
    locationData: Omit<LocationContext, 'id'>
  ): Promise<LocationContext> {
    try {
      const response = await apiClient.post<{ data: LocationContext }>('/locations', locationData);
      return response.data.data;
    } catch (err: any) {
      // If database persistence is unavailable (e.g., table pending), provide a stable in-memory ID
      console.warn('[LocationService] Persistence notice, falling back to client-generated record:', err.message);
      return {
        id: `loc-${locationData.latitude.toFixed(4)}-${locationData.longitude.toFixed(4)}`,
        ...locationData,
      };
    }
  }

  /**
   * Get location by database ID.
   */
  static async getLocationById(id: string): Promise<LocationContext> {
    const response = await apiClient.get<{ data: LocationContext }>(`/locations/${id}`);
    return response.data.data;
  }

  /**
   * Clear in-memory cache if required.
   */
  static clearCache(): void {
    this.searchCache.clear();
  }
}

export const locationService = LocationService;
