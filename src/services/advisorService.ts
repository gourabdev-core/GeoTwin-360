import { apiClient } from './api.js';
import { AIAdvisorResponse } from '../types/domain.js';

export const advisorService = {
  /**
   * Generate AI-powered climate recommendations for a location.
   * Uses a longer timeout since Gemini may take several seconds.
   */
  async getRecommendations(
    locationId: string,
    targetYear: number,
    simulationId?: string
  ): Promise<AIAdvisorResponse> {
    const response = await apiClient.post(
      '/ai/recommendations',
      {
        locationId,
        targetYear,
        simulationId,
      },
      {
        timeout: 30000, // 30s timeout for AI generation
      }
    );
    return response.data.data;
  },
};
