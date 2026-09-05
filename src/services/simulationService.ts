import { apiClient } from './api.js';
import { SimulationResult } from '../types/domain.js';

export const simulationService = {
  /**
   * Run scenario simulation for a location, year, and selected interventions.
   */
  async runSimulation(
    locationId: string,
    year: number,
    interventions: string[]
  ): Promise<SimulationResult> {
    const response = await apiClient.post('/simulations', {
      locationId,
      year,
      interventions,
    });
    return response.data.data;
  },
};
