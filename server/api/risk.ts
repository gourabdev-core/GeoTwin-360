import { Router, Request, Response, NextFunction } from 'express';
import { RiskService } from '../services/riskService.js';

const router = Router();

router.get('/:locationId/map', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId } = req.params;
  const { metric, year } = req.query;

  try {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    if (!metric) {
      const err: any = new Error('Metric query parameter is required.');
      err.statusCode = 400;
      err.code = 'MISSING_METRIC';
      throw err;
    }

    const mapData = await RiskService.getRiskMapData(locationId, metric as string, targetYear);
    res.json({
      data: mapData
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:locationId', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId } = req.params;
  const { metric, year } = req.query;

  try {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    if (metric) {
      const riskResult = await RiskService.getRisk(locationId, metric as string, targetYear);
      
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
          score: riskResult.score,
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
          const riskResult = await RiskService.getRisk(locationId, m, targetYear);
          risks[m] = {
            level: riskResult.level,
            score: riskResult.score,
            contributingFactors: riskResult.contributingFactors,
            source: riskResult.source,
            dataType: riskResult.dataType,
            confidence: riskResult.confidence
          };
        } catch (mErr) {
          risks[m] = {
            level: 'UNAVAILABLE',
            score: null,
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
          risks
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;

