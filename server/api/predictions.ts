import { Router, Request, Response, NextFunction } from 'express';
import { PredictionService } from '../services/predictionService.js';

const router = Router();

/**
 * GET /api/v1/predictions/:locationId
 *
 * Returns future climate projections for 2030, 2035, 2040, 2050.
 * Projections are generated using OLS Linear Regression on NASA POWER
 * historical observations (2015-2024).
 *
 * Query parameters:
 *   fromYear (optional) - filter projections from this year
 *   toYear   (optional) - filter projections up to this year
 */
router.get('/:locationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.params;
    const fromYear = req.query.fromYear ? Number(req.query.fromYear) : undefined;
    const toYear = req.query.toYear ? Number(req.query.toYear) : undefined;

    let projections = await PredictionService.getProjections(locationId);

    // Apply optional year range filters
    if (fromYear !== undefined && !isNaN(fromYear)) {
      projections = projections.filter(p => p.targetYear >= fromYear);
    }
    if (toYear !== undefined && !isNaN(toYear)) {
      projections = projections.filter(p => p.targetYear <= toYear);
    }

    // Build API response matching the API.md contract
    const firstProjection = projections[0];

    res.json({
      data: {
        locationId,
        projections: projections.map(p => ({
          year: p.targetYear,
          dataType: 'PROJECTED',
          metrics: {
            temperature: p.temperature,
            precipitation: p.precipitation,
            // Unsupported metrics remain null
            waterAvailability: null,
            airQualityIndex: null,
            greenCover: null,
            co2Emissions: null,
          },
          metadata: {
            variable: p.variable,
            unit: p.unit,
            modelMethod: p.modelMethod,
            baselinePeriod: p.baselinePeriod,
            sourceData: p.sourceData,
            generatedAt: p.generatedAt,
            confidence: p.confidence,
            tempRSquared: p.tempRSquared,
            precipRSquared: p.precipRSquared,
          },
        })),
        model: {
          name: 'GeoTwin 360 Projection',
          method: firstProjection?.modelMethod || 'Linear Regression (Ordinary Least Squares)',
          source: firstProjection?.sourceData || 'NASA POWER',
          baselinePeriod: firstProjection?.baselinePeriod || '2015-2024',
          confidence: firstProjection?.confidence ?? null,
          disclaimer: 'This is a GeoTwin 360 baseline trend projection using simple linear regression on historical data. It is not an official scientific climate forecast.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
