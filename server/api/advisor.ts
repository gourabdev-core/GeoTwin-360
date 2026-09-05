import { Router, Request, Response, NextFunction } from 'express';
import { AdvisorService } from '../services/advisorService.js';

const router = Router();

/**
 * POST /api/v1/ai/recommendations
 *
 * Generate AI-powered climate recommendations using verified GeoTwin data.
 *
 * Request body:
 *   locationId (string, required) - UUID of the location
 *   targetYear (number, required) - Target year for recommendations
 *   simulationId (string, optional) - UUID of a completed simulation run
 */
router.post('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, targetYear, simulationId, scenario } = req.body;

    // 1. Validate locationId
    if (!locationId || typeof locationId !== 'string') {
      const err: any = new Error('Valid locationId is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 2. Validate targetYear
    const year = Number(targetYear);
    if (isNaN(year) || year < 2000 || year > 2100) {
      const err: any = new Error('Valid targetYear parameter is required (2000-2100).');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 3. Validate optional scenario
    const validScenarios = ['default', 'resilience', 'accelerated'];
    const scenarioName = scenario && validScenarios.includes(String(scenario))
      ? String(scenario)
      : 'default';

    // 4. Validate optional simulationId
    if (simulationId !== undefined && typeof simulationId !== 'string') {
      const err: any = new Error('simulationId must be a string if provided.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 5. Generate recommendations
    const result = await AdvisorService.generateRecommendations(
      locationId,
      year,
      scenarioName,
      simulationId || undefined
    );

    // 5. Return response in envelope
    res.json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
