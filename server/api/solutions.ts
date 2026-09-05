import { Router, Request, Response, NextFunction } from 'express';
import { SolutionService } from '../services/solutionService.js';

const router = Router();

/**
 * GET /api/v1/solutions
 *
 * Query parameters:
 *   locationId (string, required) - ID of the target location
 *   year (number, optional, default 2035) - Target year (2030, 2035, 2040, 2050)
 *   scenario (string, optional, default 'default') - 'default' | 'resilience' | 'accelerated'
 *   includeAi (boolean, optional, default false) - Whether to generate optional Gemini explanation
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, year, scenario, includeAi } = req.query;

    if (!locationId || typeof locationId !== 'string') {
      const err: any = new Error('Valid locationId query parameter is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const targetYear = year ? Number(year) : 2035;
    if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
      const err: any = new Error('Valid year query parameter is required (2000-2100).');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const scenarioKey = typeof scenario === 'string' ? scenario : 'default';
    const withAi = includeAi === 'true' || includeAi === '1';

    const solutionsData = await SolutionService.getSolutions(
      locationId,
      targetYear,
      scenarioKey,
      withAi
    );

    res.json({
      data: solutionsData,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/solutions/personalize
 *
 * Generate or refresh Gemini personalized narrative for current resilience solutions.
 *
 * Body parameters:
 *   locationId (string, required)
 *   year (number, optional, default 2035)
 *   scenario (string, optional, default 'default')
 */
router.post('/personalize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, year, scenario } = req.body;

    if (!locationId || typeof locationId !== 'string') {
      const err: any = new Error('Valid locationId is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const targetYear = year ? Number(year) : 2035;
    const scenarioKey = typeof scenario === 'string' ? scenario : 'default';

    const solutionsData = await SolutionService.getSolutions(
      locationId,
      targetYear,
      scenarioKey,
      true
    );

    res.json({
      data: solutionsData,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
