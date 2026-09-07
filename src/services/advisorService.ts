import { apiClient } from './api.js';
import { AIAdvisorResponse } from '../types/domain.js';

interface CacheEntry {
  data: AIAdvisorResponse;
  timestamp: number;
}

const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sessionCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<AIAdvisorResponse>>();

function buildCacheKey(
  locationId: string,
  targetYear: number,
  scenario = 'default',
  simulationId?: string,
  mode: 'ai' | 'deterministic' = 'ai'
): string {
  return `${locationId}:${targetYear}:${scenario}:${simulationId || 'none'}:${mode}`;
}

export const advisorService = {
  /**
   * Check if a cached recommendation exists for the parameters without making any network request.
   */
  getCachedRecommendations(
    locationId: string,
    targetYear: number,
    scenario?: string,
    simulationId?: string,
    mode: 'ai' | 'deterministic' = 'ai'
  ): AIAdvisorResponse | null {
    const key = buildCacheKey(locationId, targetYear, scenario, simulationId, mode);
    const entry = sessionCache.get(key);
    if (entry && Date.now() - entry.timestamp < CLIENT_CACHE_TTL_MS) {
      return entry.data;
    }
    return null;
  },

  /**
   * Clear client cache for a specific location or completely.
   */
  clearCache(locationId?: string): void {
    if (locationId) {
      for (const key of sessionCache.keys()) {
        if (key.startsWith(`${locationId}:`)) {
          sessionCache.delete(key);
        }
      }
    } else {
      sessionCache.clear();
    }
  },

  /**
   * Generate AI-powered climate recommendations or deterministic model analysis.
   * Includes client-side caching and simultaneous request deduplication.
   */
  async getRecommendations(
    locationId: string,
    targetYear: number,
    scenario?: string,
    simulationId?: string,
    mode: 'ai' | 'deterministic' = 'ai',
    forceRefresh = false
  ): Promise<AIAdvisorResponse> {
    const key = buildCacheKey(locationId, targetYear, scenario, simulationId, mode);

    // 1. Check client session cache
    if (!forceRefresh) {
      const cached = this.getCachedRecommendations(locationId, targetYear, scenario, simulationId, mode);
      if (cached) {
        return cached;
      }
    }

    // 2. Deduplicate in-flight requests for identical parameters
    const existing = inFlightRequests.get(key);
    if (existing) {
      return existing;
    }

    // 3. Initiate request
    const requestPromise = (async () => {
      try {
        const response = await apiClient.post(
          '/ai/recommendations',
          {
            locationId,
            targetYear,
            scenario: scenario || 'default',
            simulationId,
            mode,
          },
          {
            timeout: 30000, // 30s timeout for AI generation
          }
        );

        const data: AIAdvisorResponse = response.data.data;

        // Store in client session cache
        sessionCache.set(key, {
          data,
          timestamp: Date.now(),
        });

        return data;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, requestPromise);
    return requestPromise;
  },
};
