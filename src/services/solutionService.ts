import { apiClient } from './api.js';
import { ResilienceSolutionsResponse } from '../types/solution.js';

export const solutionService = {
  /**
   * Fetch data-grounded resilience solutions for a location, target year, and scenario.
   */
  async getSolutions(
    locationId: string,
    year: number = 2035,
    scenario: string = 'default',
    includeAi: boolean = false
  ): Promise<ResilienceSolutionsResponse> {
    const response = await apiClient.get('/solutions', {
      params: {
        locationId,
        year,
        scenario,
        includeAi: includeAi ? 'true' : 'false',
      },
    });
    return response.data.data;
  },

  /**
   * Generate or refresh optional Gemini AI contextual strategic explanation.
   */
  async personalizeSolutions(
    locationId: string,
    year: number = 2035,
    scenario: string = 'default'
  ): Promise<ResilienceSolutionsResponse> {
    const response = await apiClient.post(
      '/solutions/personalize',
      {
        locationId,
        year,
        scenario,
      },
      {
        timeout: 30000,
      }
    );
    return response.data.data;
  },
};
