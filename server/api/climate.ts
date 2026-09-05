import { Router, Request, Response, NextFunction } from 'express';
import { ClimateService } from '../services/climateService.js';
import { PredictionService } from '../services/predictionService.js';
import { LocationService } from '../services/locationService.js';
import { OpenMeteoService } from '../services/openMeteoService.js';

const router = Router();

router.get('/:locationId', async (req: Request, res: Response, next: NextFunction) => {
  const { locationId } = req.params;
  const { year } = req.query;

  try {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    // Resolve location coordinates for Open-Meteo API query
    let lat = 0;
    let lng = 0;
    try {
      const loc = await LocationService.getLocationById(locationId);
      if (loc) {
        lat = Number(loc.latitude);
        lng = Number(loc.longitude);
      }
    } catch (e) {}

    // Fetch live Open-Meteo environmental metrics
    let envData = null;
    if (lat !== 0 || lng !== 0) {
      envData = await OpenMeteoService.fetchEnvironmentalData(lat, lng);
    }

    // Future year: use prediction engine for supported metrics
    if (targetYear > 2026) {
      try {
        const projection = await PredictionService.getProjectionForYear(locationId, targetYear);

        if (projection && projection.temperature !== null) {
          let history: any[] = [];
          try {
            const histRecords = await ClimateService.getHistoricalClimate(locationId);
            history = histRecords.map(r => ({
              year: r.year ?? new Date(r.observedAt).getUTCFullYear(),
              temperature: r.temperature,
              precipitation: r.precipitation,
            }));
          } catch {}

          res.json({
            data: {
              locationId,
              year: targetYear,
              dataType: 'PROJECTED',
              metrics: {
                temperature: {
                  value: parseFloat(Number(projection.temperature).toFixed(1)),
                  unit: '°C',
                },
                waterAvailability: envData?.waterAvailability ? {
                  value: envData.waterAvailability.value,
                  unit: envData.waterAvailability.unit,
                  stressLevel: envData.waterAvailability.stressLevel,
                } : null,
                airQuality: envData?.airQuality ? {
                  aqi: envData.airQuality.aqi,
                  category: envData.airQuality.category,
                } : null,
                greenCover: envData?.greenCover ? {
                  value: envData.greenCover.value,
                  unit: envData.greenCover.unit,
                } : null,
                co2Emissions: envData?.co2Emissions ? {
                  value: envData.co2Emissions.value,
                  unit: envData.co2Emissions.unit,
                } : null,
              },
              projection: {
                modelMethod: projection.modelMethod,
                baselinePeriod: projection.baselinePeriod,
                sourceData: projection.sourceData,
                confidence: projection.confidence,
                generatedAt: projection.generatedAt,
                disclaimer: 'GeoTwin 360 Projection - simple trend extrapolation, not an official climate forecast.',
              },
              history,
            },
          });
          return;
        }
      } catch (predErr: any) {
        console.warn(`[ClimateAPI] Prediction unavailable for year ${targetYear}:`, predErr.message);
      }

      res.json({
        data: {
          locationId,
          year: targetYear,
          dataType: 'PROJECTED',
          metrics: {
            temperature: null,
            waterAvailability: envData?.waterAvailability ? {
              value: envData.waterAvailability.value,
              unit: envData.waterAvailability.unit,
              stressLevel: envData.waterAvailability.stressLevel,
            } : null,
            airQuality: envData?.airQuality ? {
              aqi: envData.airQuality.aqi,
              category: envData.airQuality.category,
            } : null,
            greenCover: envData?.greenCover ? {
              value: envData.greenCover.value,
              unit: envData.greenCover.unit,
            } : null,
            co2Emissions: envData?.co2Emissions ? {
              value: envData.co2Emissions.value,
              unit: envData.co2Emissions.unit,
            } : null,
          },
          history: [],
        },
      });
      return;
    }

    // Current / historical year
    const history = await ClimateService.getHistoricalClimate(locationId);

    const validTemps = history.filter(r => r.temperature !== null);
    const avgTemp = validTemps.length > 0
      ? validTemps.reduce((sum, r) => sum + (r.temperature || 0), 0) / validTemps.length
      : null;

    res.json({
      data: {
        locationId,
        year: targetYear,
        dataType: 'HISTORICAL',
        metrics: {
          temperature: avgTemp !== null ? {
            value: parseFloat(avgTemp.toFixed(1)),
            unit: '°C'
          } : null,
          waterAvailability: envData?.waterAvailability ? {
            value: envData.waterAvailability.value,
            unit: envData.waterAvailability.unit,
            stressLevel: envData.waterAvailability.stressLevel,
          } : null,
          airQuality: envData?.airQuality ? {
            aqi: envData.airQuality.aqi,
            category: envData.airQuality.category,
          } : null,
          greenCover: envData?.greenCover ? {
            value: envData.greenCover.value,
            unit: envData.greenCover.unit,
          } : null,
          co2Emissions: envData?.co2Emissions ? {
            value: envData.co2Emissions.value,
            unit: envData.co2Emissions.unit,
          } : null,
        },
        history,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
