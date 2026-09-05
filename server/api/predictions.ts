import { Router, Request, Response, NextFunction } from 'express';
import { PredictionService, SCENARIO_DEFINITIONS } from '../services/predictionService.js';
import { ScenarioType } from '../types/prediction.js';

const router = Router();

/**
 * GET /api/v1/predictions
 *
 * Query parameters:
 *   locationId (or lat + lng)
 *   year (or targetYear, e.g. 2030, 2035, 2040, 2050)
 *   scenario ('default' | 'resilience' | 'accelerated')
 *   fromYear (optional)
 *   toYear (optional)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, lat, lng } = req.query;
    const locId = locationId
      ? String(locationId)
      : (lat && lng ? `loc-${parseFloat(String(lat)).toFixed(4)}-${parseFloat(String(lng)).toFixed(4)}` : null);

    if (!locId) {
      const err: any = new Error('Query parameter "locationId" or "lat" and "lng" is required.');
      err.statusCode = 400;
      err.code = 'MISSING_LOCATION';
      throw err;
    }

    const year = req.query.year ? Number(req.query.year) : (req.query.targetYear ? Number(req.query.targetYear) : 2035);
    const scenario = (req.query.scenario as ScenarioType) || 'default';
    const fromYear = req.query.fromYear ? Number(req.query.fromYear) : undefined;
    const toYear = req.query.toYear ? Number(req.query.toYear) : undefined;
    const includeAi = req.query.includeAi === 'true' || req.query.includeAi === '1';

    // 1. Fetch full data-driven climate analysis for target year & scenario
    const analysis = await PredictionService.getClimateAnalysis(locId, year, scenario, includeAi);

    // 2. Fetch projections timeline for chart
    let projections = await PredictionService.getProjections(locId, scenario);

    if (fromYear !== undefined && !isNaN(fromYear)) {
      projections = projections.filter(p => p.targetYear >= fromYear);
    }
    if (toYear !== undefined && !isNaN(toYear)) {
      projections = projections.filter(p => p.targetYear <= toYear);
    }

    const firstProjection = projections[0];

    res.json({
      data: {
        locationId: locId,
        targetYear: analysis.targetYear,
        scenario: analysis.scenario,
        availableScenarios: Object.values(SCENARIO_DEFINITIONS),
        analysis,
        projections: projections.map(p => ({
          year: p.targetYear,
          dataType: 'PROJECTED',
          scenario: p.scenario,
          metrics: {
            temperature: p.temperature,
            precipitation: p.precipitation,
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
          name: 'GeoTwin 360 Prediction Engine',
          method: firstProjection?.modelMethod || 'Linear Regression (Ordinary Least Squares)',
          source: firstProjection?.sourceData || 'NASA POWER Satellite Observations',
          baselinePeriod: firstProjection?.baselinePeriod || '2015-2025',
          confidence: firstProjection?.confidence ?? null,
          disclaimer: 'This is a GeoTwin 360 baseline trend projection using statistical regression on historical NASA satellite data modulated by scenario assumptions. It is not an official scientific GCM forecast.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/predictions/:locationId
 */
router.get('/:locationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.params;
    const year = req.query.year ? Number(req.query.year) : (req.query.targetYear ? Number(req.query.targetYear) : 2035);
    const scenario = (req.query.scenario as ScenarioType) || 'default';
    const fromYear = req.query.fromYear ? Number(req.query.fromYear) : undefined;
    const toYear = req.query.toYear ? Number(req.query.toYear) : undefined;
    const includeAi = req.query.includeAi === 'true' || req.query.includeAi === '1';

    const analysis = await PredictionService.getClimateAnalysis(locationId, year, scenario, includeAi);
    let projections = await PredictionService.getProjections(locationId, scenario);

    if (fromYear !== undefined && !isNaN(fromYear)) {
      projections = projections.filter(p => p.targetYear >= fromYear);
    }
    if (toYear !== undefined && !isNaN(toYear)) {
      projections = projections.filter(p => p.targetYear <= toYear);
    }

    const firstProjection = projections[0];

    res.json({
      data: {
        locationId,
        targetYear: analysis.targetYear,
        scenario: analysis.scenario,
        availableScenarios: Object.values(SCENARIO_DEFINITIONS),
        analysis,
        projections: projections.map(p => ({
          year: p.targetYear,
          dataType: 'PROJECTED',
          scenario: p.scenario,
          metrics: {
            temperature: p.temperature,
            precipitation: p.precipitation,
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
          name: 'GeoTwin 360 Prediction Engine',
          method: firstProjection?.modelMethod || 'Linear Regression (Ordinary Least Squares)',
          source: firstProjection?.sourceData || 'NASA POWER Satellite Observations',
          baselinePeriod: firstProjection?.baselinePeriod || '2015-2025',
          confidence: firstProjection?.confidence ?? null,
          disclaimer: 'This is a GeoTwin 360 baseline trend projection using statistical regression on historical NASA satellite data modulated by scenario assumptions. It is not an official scientific GCM forecast.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
