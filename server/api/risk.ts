import { Router, Request, Response, NextFunction } from 'express';
import { RiskService } from '../services/riskService.js';

const router = Router();

router.get('/map', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId, lat, lng, metric, year, scenario } = req.query;

  try {
    const locId = locationId
      ? String(locationId)
      : (lat && lng ? `loc-${parseFloat(String(lat)).toFixed(4)}-${parseFloat(String(lng)).toFixed(4)}` : null);

    if (!locId) {
      const err: any = new Error('Query parameter "locationId" or "lat" and "lng" is required.');
      err.statusCode = 400;
      err.code = 'MISSING_LOCATION';
      throw err;
    }

    const targetYear = year ? Number(year) : new Date().getFullYear();
    const activeScenario = scenario ? String(scenario) : 'default';

    if (!metric) {
      const err: any = new Error('Metric query parameter is required.');
      err.statusCode = 400;
      err.code = 'MISSING_METRIC';
      throw err;
    }

    const mapData = await RiskService.getRiskMapData(locId, metric as string, targetYear, activeScenario);
    res.json({
      data: mapData
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:locationId/map', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId } = req.params;
  const { metric, year, scenario } = req.query;

  try {
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const activeScenario = scenario ? String(scenario) : 'default';

    if (!metric) {
      const err: any = new Error('Metric query parameter is required.');
      err.statusCode = 400;
      err.code = 'MISSING_METRIC';
      throw err;
    }

    const mapData = await RiskService.getRiskMapData(locationId, metric as string, targetYear, activeScenario);
    res.json({
      data: mapData
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId, lat, lng, metric, year, scenario } = req.query;

  try {
    const locId = locationId
      ? String(locationId)
      : (lat && lng ? `loc-${parseFloat(String(lat)).toFixed(4)}-${parseFloat(String(lng)).toFixed(4)}` : null);

    if (!locId) {
      const err: any = new Error('Query parameter "locationId" or "lat" and "lng" is required.');
      err.statusCode = 400;
      err.code = 'MISSING_LOCATION';
      throw err;
    }

    const targetYear = year ? Number(year) : new Date().getFullYear();
    const activeScenario = scenario ? String(scenario) : 'default';

    if (metric) {
      const riskResult = await RiskService.getRisk(locId, metric as string, targetYear, activeScenario);
      res.json({
        data: {
          locationId: riskResult.locationId,
          metric: riskResult.metric,
          year: riskResult.year,
          scenario: activeScenario,
          score: riskResult.score,
          unit: riskResult.unit || 'score (0-1)',
          level: riskResult.level,
          dataType: riskResult.dataType,
          contributingFactors: riskResult.contributingFactors,
          source: riskResult.source,
          confidence: riskResult.confidence
        }
      });
    } else {
      const metricsList = ['temperature', 'flood', 'air_quality', 'water_stress'];
      const risks: Record<string, any> = {};

      for (const m of metricsList) {
        try {
          const riskResult = await RiskService.getRisk(locId, m, targetYear, activeScenario);
          risks[m] = {
            level: riskResult.level,
            score: riskResult.score,
            unit: riskResult.unit || 'score (0-1)',
            contributingFactors: riskResult.contributingFactors,
            source: riskResult.source,
            dataType: riskResult.dataType,
            confidence: riskResult.confidence
          };
        } catch {
          risks[m] = {
            level: 'UNAVAILABLE',
            score: null,
            unit: 'score (0-1)',
            contributingFactors: ['Calculations could not be completed.'],
            source: null,
            dataType: 'UNAVAILABLE',
            confidence: 'UNAVAILABLE'
          };
        }
      }

      res.json({
        data: {
          locationId: locId,
          year: targetYear,
          scenario: activeScenario,
          risks
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:locationId', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId } = req.params;
  const { metric, year, scenario } = req.query;

  try {
    const targetYear = year ? Number(year) : new Date().getFullYear();
    const activeScenario = scenario ? String(scenario) : 'default';

    if (metric) {
      const riskResult = await RiskService.getRisk(locationId, metric as string, targetYear, activeScenario);
      
      if (riskResult.level === 'UNAVAILABLE') {
        const err: any = new Error(`${metric} risk intelligence is currently unavailable.`);
        err.statusCode = 503;
        err.code = 'RISK_DATA_UNAVAILABLE';
        throw err;
      }

      res.json({
        data: {
          locationId: riskResult.locationId,
          metric: riskResult.metric,
          year: riskResult.year,
          scenario: activeScenario,
          score: riskResult.score,
          unit: riskResult.unit || 'score (0-1)',
          level: riskResult.level,
          dataType: riskResult.dataType,
          contributingFactors: riskResult.contributingFactors,
          source: riskResult.source ? {
            provider: riskResult.source.provider,
            timestamp: riskResult.source.timestamp
          } : null,
          confidence: riskResult.confidence
        }
      });
    } else {
      // If no specific metric requested, compile a full summary of all risks
      const metricsList = ['temperature', 'flood', 'air_quality', 'water_stress'];
      const risks: Record<string, any> = {};

      for (const m of metricsList) {
        try {
          const riskResult = await RiskService.getRisk(locationId, m, targetYear, activeScenario);
          risks[m] = {
            level: riskResult.level,
            score: riskResult.score,
            unit: riskResult.unit || 'score (0-1)',
            contributingFactors: riskResult.contributingFactors,
            source: riskResult.source,
            dataType: riskResult.dataType,
            confidence: riskResult.confidence
          };
        } catch (mErr) {
          risks[m] = {
            level: 'UNAVAILABLE',
            score: null,
            unit: 'score (0-1)',
            contributingFactors: ['Calculations could not be completed.'],
            source: null,
            dataType: 'UNAVAILABLE',
            confidence: 'UNAVAILABLE'
          };
        }
      }

      res.json({
        data: {
          locationId,
          year: targetYear,
          scenario: activeScenario,
          risks
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;

