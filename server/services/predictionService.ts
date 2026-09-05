import { supabase } from '../config/supabase.js';
import { ClimateService } from './climateService.js';
import { LocationService } from './locationService.js';

/**
 * GeoTwin 360 Prediction Engine
 *
 * Methodology: Ordinary Least Squares (OLS) Linear Regression
 *
 * This service uses historical annual climate observations from NASA POWER
 * (2015-2024, 10 data points of temperature and precipitation) to fit a
 * simple linear trend line for each variable. The trend is then extrapolated
 * to target future years (2030, 2035, 2040, 2050).
 *
 * This is a transparent, statistically explainable baseline projection.
 * It is NOT a complex GCM climate model. Results are labelled as
 * "GeoTwin 360 Projection" and should not be presented as official
 * scientific forecasts.
 *
 * Limitations:
 * - Assumes a linear trend, which may not capture non-linear climate dynamics.
 * - Based on only 10 years of data, which limits statistical power.
 * - Does not account for emission scenarios, policy changes, or feedback loops.
 * - Precipitation is clamped to >= 0 to prevent physical impossibilities.
 *
 * Confidence is reported as the R-squared coefficient of determination
 * for each variable's regression fit.
 */

interface RegressionPoint {
  x: number;
  y: number;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface ProjectionRecord {
  locationId: string;
  targetYear: number;
  temperature: number | null;
  precipitation: number | null;
  unit: string;
  variable: string;
  modelMethod: string;
  baselinePeriod: string;
  sourceData: string;
  generatedAt: string;
  confidence: number | null;
  tempRSquared: number | null;
  precipRSquared: number | null;
  locationName: string;
}

export class PredictionService {
  private static readonly TARGET_YEARS = [2030, 2035, 2040, 2050];
  private static readonly MIN_DATA_POINTS = 5;
  private static readonly MODEL_METHOD = 'Linear Regression (Ordinary Least Squares)';
  private static readonly BASELINE_PERIOD = '2015-2024';
  private static readonly SOURCE_DATA = 'NASA POWER';

  /**
   * Compute OLS linear regression: y = slope * x + intercept
   * Returns slope, intercept, and R-squared coefficient of determination.
   * Returns null if fewer than MIN_DATA_POINTS are provided.
   */
  private static computeRegression(points: RegressionPoint[]): RegressionResult | null {
    const n = points.length;
    if (n < this.MIN_DATA_POINTS) return null;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (const p of points) {
      const predicted = slope * p.x + intercept;
      ssTot += (p.y - meanY) ** 2;
      ssRes += (p.y - predicted) ** 2;
    }

    const rSquared = ssTot === 0 ? 1.0 : Math.max(0, 1.0 - ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  /**
   * Get or generate climate projections for a location.
   * Checks the climate_projections cache first.
   * On cache miss, fetches historical data, runs linear regression,
   * and stores results.
   */
  static async getProjections(locationId: string): Promise<ProjectionRecord[]> {
    // 1. Resolve location
    const location = await LocationService.getLocationById(locationId);
    const locationName = location.name || 'Unknown';

    // 2. Check cache
    try {
      console.log(`[PredictionService] Checking cache for location: ${locationId}`);
      const { data: cached, error: cacheErr } = await supabase
        .from('climate_projections')
        .select('*')
        .eq('location_id', locationId)
        .eq('model_name', 'Linear Regression')
        .order('target_year', { ascending: true });

      if (!cacheErr && cached && cached.length >= this.TARGET_YEARS.length) {
        const hasAll = this.TARGET_YEARS.every(yr =>
          cached.some((c: any) => c.target_year === yr)
        );
        if (hasAll) {
          console.log(`[PredictionService] Cache HIT. Returning ${cached.length} cached projections.`);
          return cached
            .filter((c: any) => this.TARGET_YEARS.includes(c.target_year))
            .map((c: any) => ({
              locationId: c.location_id,
              targetYear: c.target_year,
              temperature: c.temperature !== null ? Number(c.temperature) : null,
              precipitation: c.metadata?.precipitation !== undefined
                ? Number(c.metadata.precipitation) : null,
              unit: 'C',
              variable: 'temperature',
              modelMethod: this.MODEL_METHOD,
              baselinePeriod: this.BASELINE_PERIOD,
              sourceData: this.SOURCE_DATA,
              generatedAt: c.metadata?.generatedAt || c.created_at,
              confidence: c.confidence !== null ? Number(c.confidence) : null,
              tempRSquared: c.metadata?.tempRSquared ?? null,
              precipRSquared: c.metadata?.precipRSquared ?? null,
              locationName,
            }));
        }
      }
    } catch (cacheCheckErr: any) {
      console.error('[PredictionService] Cache check failed:', cacheCheckErr.message);
    }

    // 3. Cache miss: fetch historical data
    console.log(`[PredictionService] Cache MISS. Fetching historical data...`);
    const history = await ClimateService.getHistoricalClimate(locationId);

    // 4. Build regression input arrays
    const tempPoints: RegressionPoint[] = [];
    const precipPoints: RegressionPoint[] = [];

    for (const rec of history) {
      const year = rec.year ?? new Date(rec.observedAt).getUTCFullYear();
      if (rec.temperature !== null) {
        tempPoints.push({ x: year, y: rec.temperature });
      }
      if (rec.precipitation !== null) {
        precipPoints.push({ x: year, y: rec.precipitation });
      }
    }

    console.log(`[PredictionService] Data points - temperature: ${tempPoints.length}, precipitation: ${precipPoints.length}`);

    // 5. Validate data sufficiency
    if (tempPoints.length < this.MIN_DATA_POINTS) {
      console.warn(`[PredictionService] Insufficient temperature data (${tempPoints.length} points, need ${this.MIN_DATA_POINTS}).`);
      const err: any = new Error(
        `Projection unavailable: insufficient historical temperature data (${tempPoints.length} records, minimum ${this.MIN_DATA_POINTS} required).`
      );
      err.statusCode = 503;
      err.code = 'PREDICTIONS_UNAVAILABLE';
      throw err;
    }

    // 6. Compute regressions
    const tempModel = this.computeRegression(tempPoints);
    if (!tempModel) {
      const err: any = new Error('Projection unavailable: temperature trend computation failed.');
      err.statusCode = 503;
      err.code = 'PREDICTIONS_UNAVAILABLE';
      throw err;
    }

    // Precipitation model is optional - some locations may have sparse data
    const precipModel = precipPoints.length >= this.MIN_DATA_POINTS
      ? this.computeRegression(precipPoints)
      : null;

    console.log(`[PredictionService] Temperature model: slope=${tempModel.slope.toFixed(4)}/yr, R2=${tempModel.rSquared.toFixed(4)}`);
    if (precipModel) {
      console.log(`[PredictionService] Precipitation model: slope=${precipModel.slope.toFixed(4)}/yr, R2=${precipModel.rSquared.toFixed(4)}`);
    }

    // 7. Generate projections
    const generatedAt = new Date().toISOString();
    const results: ProjectionRecord[] = [];

    for (const year of this.TARGET_YEARS) {
      const predictedTemp = parseFloat((tempModel.slope * year + tempModel.intercept).toFixed(2));
      const predictedPrecip = precipModel
        ? parseFloat(Math.max(0, precipModel.slope * year + precipModel.intercept).toFixed(2))
        : null;

      // 8. Persist to database
      try {
        const { error: insertErr } = await supabase
          .from('climate_projections')
          .insert({
            location_id: locationId,
            target_year: year,
            model_name: 'Linear Regression',
            scenario_name: 'Baseline Trend',
            temperature: predictedTemp,
            confidence: parseFloat(tempModel.rSquared.toFixed(4)),
            source: this.SOURCE_DATA,
            metadata: {
              precipitation: predictedPrecip,
              baselinePeriod: this.BASELINE_PERIOD,
              sourceData: this.SOURCE_DATA,
              modelMethod: this.MODEL_METHOD,
              generatedAt,
              locationName,
              tempSlope: parseFloat(tempModel.slope.toFixed(6)),
              tempIntercept: parseFloat(tempModel.intercept.toFixed(4)),
              tempRSquared: parseFloat(tempModel.rSquared.toFixed(4)),
              precipSlope: precipModel ? parseFloat(precipModel.slope.toFixed(6)) : null,
              precipIntercept: precipModel ? parseFloat(precipModel.intercept.toFixed(4)) : null,
              precipRSquared: precipModel ? parseFloat(precipModel.rSquared.toFixed(4)) : null,
            },
          });

        if (insertErr) {
          console.error(`[PredictionService] DB insert error for year ${year}:`, insertErr.message);
        }
      } catch (dbErr: any) {
        console.error(`[PredictionService] DB persistence error for year ${year}:`, dbErr.message);
      }

      results.push({
        locationId,
        targetYear: year,
        temperature: predictedTemp,
        precipitation: predictedPrecip,
        unit: 'C',
        variable: 'temperature',
        modelMethod: this.MODEL_METHOD,
        baselinePeriod: this.BASELINE_PERIOD,
        sourceData: this.SOURCE_DATA,
        generatedAt,
        confidence: parseFloat(tempModel.rSquared.toFixed(4)),
        tempRSquared: parseFloat(tempModel.rSquared.toFixed(4)),
        precipRSquared: precipModel ? parseFloat(precipModel.rSquared.toFixed(4)) : null,
        locationName,
      });
    }

    console.log(`[PredictionService] Generated ${results.length} projections for location ${locationId}.`);
    return results;
  }

  /**
   * Get a single projection for a specific year.
   * Returns null if the year is not a supported target year.
   */
  static async getProjectionForYear(
    locationId: string,
    targetYear: number
  ): Promise<ProjectionRecord | null> {
    if (!this.TARGET_YEARS.includes(targetYear)) {
      return null;
    }

    const projections = await this.getProjections(locationId);
    return projections.find(p => p.targetYear === targetYear) ?? null;
  }
}
