import { Router, Request, Response, NextFunction } from 'express';
import { SimulationService } from '../services/simulationService.js';

const router = Router();

/**
 * POST /api/v1/simulations
 *
 * Runs a climate scenario simulation.
 * Request body:
 *   locationId (string, required) - UUID of the location
 *   year (number, required) - Simulation year (e.g. 2030, 2035, 2040, 2050)
 *   interventions (string[], required) - Array of selected intervention slugs
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId, year, interventions } = req.body;

  try {
    // 1. Validation
    if (!locationId || typeof locationId !== 'string') {
      const err: any = new Error('Valid locationId is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const targetYear = Number(year);
    if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
      const err: any = new Error('Valid year parameter is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!Array.isArray(interventions)) {
      const err: any = new Error('Interventions must be an array of slugs.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const activeScenario = req.body.scenario ? String(req.body.scenario) : 'default';

    // 2. Execute simulation
    const result = await SimulationService.runSimulation(locationId, targetYear, interventions, activeScenario);

    // 3. Return response in envelope
    res.json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
