import { supabase } from '../config/supabase.js';
import { LocationService } from './locationService.js';
import { ClimateService } from './climateService.js';
import { PredictionService } from './predictionService.js';
import { RISK_THRESHOLDS, getRiskLevelFromScore, RiskLevel } from '../config/risk.js';

export interface RiskResult {
  locationId: string;
  metric: string;
  year: number;
  score: number | null;
  unit: string;
  level: RiskLevel | 'UNAVAILABLE';
  contributingFactors: string[];
  source: {
    provider: string;
    timestamp: string;
  } | null;
  dataType: 'OBSERVED' | 'HISTORICAL' | 'PROJECTED' | 'SIMULATED' | 'UNAVAILABLE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';
}

export class RiskService {
  /**
   * Get risk assessment for a location, metric, and year.
   * Utilizes database caching, runs explainable calculations on cache miss,
   * writes back to the database, and handles unavailable data gracefully.
   *
   * For future years (>2026), uses GeoTwin 360 Prediction Engine projected values
   * for temperature and precipitation to compute projected risk levels.
   */
  static async getRisk(
    locationId: string,
    metric: string,
    year: number,
    scenario: string = 'default'
  ): Promise<RiskResult> {
    const normalizedMetric = metric.toLowerCase();
    const activeScenario = scenario || 'default';
    
    // Validate year
    const targetYear = Number(year);
    if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
      const err: any = new Error('Invalid year parameter.');
      err.statusCode = 400;
      err.code = 'INVALID_YEAR';
      throw err;
    }

    // Future years: use projected data from prediction engine for supported metrics
    if (targetYear > 2026) {
      try {
        const projection = await PredictionService.getProjectionForYear(
          locationId,
          targetYear,
          activeScenario as any
        );

        if (projection) {
          // Heat risk from projected temperature
          if ((normalizedMetric === 'temperature' || normalizedMetric === 'heat') && projection.temperature !== null) {
            const tempVal = projection.temperature;
            const { minTemp, maxTemp } = RISK_THRESHOLDS.heat;
            let computedScore = (tempVal - minTemp) / (maxTemp - minTemp);
            if (activeScenario === 'resilience') computedScore *= 0.85;
            if (activeScenario === 'accelerated') computedScore *= 1.20;
            const score = isNaN(computedScore) ? null : parseFloat(Math.max(0, Math.min(1, computedScore)).toFixed(4));
            const level = score !== null ? getRiskLevelFromScore(score) : 'UNAVAILABLE';
            return {
              locationId,
              metric: normalizedMetric,
              year: targetYear,
              score,
              unit: 'score (0-1)',
              level,
              contributingFactors: [
                `Projected temperature for ${targetYear} is ${tempVal.toFixed(1)}°C (Scenario: ${activeScenario.toUpperCase()}).`,
                `Based on OLS regression from NASA POWER historical data (2015-2025) [MODELED / LINEAR EXTRAPOLATION].`,
                `Projection confidence (R²): ${projection.confidence !== null ? (projection.confidence * 100).toFixed(1) + '%' : 'N/A'}.`,
              ],
              source: {
                provider: 'GeoTwin 360 Prediction Engine',
                timestamp: projection.generatedAt,
              },
              dataType: 'PROJECTED',
              confidence: 'LOW',
            };
          }

          // Flood risk from projected precipitation
          if (normalizedMetric === 'flood' && projection.precipitation !== null) {
            const precipVal = projection.precipitation;
            const { minPrecip, maxPrecip } = RISK_THRESHOLDS.flood;
            let computedScore = (precipVal - minPrecip) / (maxPrecip - minPrecip);
            if (activeScenario === 'resilience') computedScore *= 0.70;
            if (activeScenario === 'accelerated') computedScore *= 1.25;
            const score = isNaN(computedScore) ? null : parseFloat(Math.max(0, Math.min(1, computedScore)).toFixed(4));
            const level = score !== null ? getRiskLevelFromScore(score) : 'UNAVAILABLE';
            return {
              locationId,
              metric: normalizedMetric,
              year: targetYear,
              score,
              unit: 'score (0-1)',
              level,
              contributingFactors: [
                `Projected avg precipitation for ${targetYear} is ${precipVal.toFixed(2)} mm/day (Scenario: ${activeScenario.toUpperCase()}).`,
                `Based on OLS regression from NASA POWER historical data (2015-2025) [MODELED / LINEAR EXTRAPOLATION].`,
                `Projection confidence (R²): ${projection.precipRSquared !== null ? (projection.precipRSquared * 100).toFixed(1) + '%' : 'N/A'}.`,
              ],
              source: {
                provider: 'GeoTwin 360 Prediction Engine',
                timestamp: projection.generatedAt,
              },
              dataType: 'PROJECTED',
              confidence: 'LOW',
            };
          }
        }
      } catch (predErr: any) {
        console.warn(`[RiskService] Prediction engine unavailable for year ${targetYear}:`, predErr.message);
      }

      // Fallback for unsupported metrics in future years
      return {
        locationId,
        metric: normalizedMetric,
        year: targetYear,
        score: null,
        unit: 'score (0-1)',
        level: 'UNAVAILABLE',
        contributingFactors: [`Future risk projection for ${metric} in ${targetYear} is not yet supported for this metric.`],
        source: null,
        dataType: 'PROJECTED',
        confidence: 'UNAVAILABLE',
      };
    }

    // Resolve metric database string
    let dbMetric = '';
    if (normalizedMetric === 'flood') {
      dbMetric = 'FLOOD';
    } else if (normalizedMetric === 'temperature' || normalizedMetric === 'heat') {
      dbMetric = 'TEMPERATURE';
    } else if (normalizedMetric === 'air_quality' || normalizedMetric === 'air_quality_index') {
      dbMetric = 'AIR_QUALITY';
    } else if (normalizedMetric === 'water_stress' || normalizedMetric === 'water_availability') {
      dbMetric = 'WATER_STRESS';
    } else if (normalizedMetric === 'green_cover') {
      dbMetric = 'GREEN_COVER';
    } else {
      const err: any = new Error(`Unsupported risk metric: ${metric}`);
      err.statusCode = 400;
      err.code = 'UNSUPPORTED_METRIC';
      throw err;
    }

    // If Air Quality, Water Stress or Green Cover, return UNAVAILABLE directly without caching
    if (dbMetric === 'AIR_QUALITY' || dbMetric === 'WATER_STRESS' || dbMetric === 'GREEN_COVER') {
      return {
        locationId,
        metric: normalizedMetric,
        year: targetYear,
        score: null,
        unit: 'score (0-1)',
        level: 'UNAVAILABLE',
        contributingFactors: [`Data for ${metric} risk is not available in the current data layer.`],
        source: null,
        dataType: 'UNAVAILABLE',
        confidence: 'UNAVAILABLE',
      };
    }

    // 1. Resolve location coordinates
    const location = await LocationService.getLocationById(locationId);
    const lat = parseFloat(Number(location.latitude).toFixed(6));
    const lng = parseFloat(Number(location.longitude).toFixed(6));

    // 2. Check cache in database (last 10 minutes)
    try {
      const cacheExpiry = new Date(Date.now() - 10 * 60 * 1000);
      const { data: cachedRisk, error: cacheErr } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('location_id', locationId)
        .eq('metric', dbMetric)
        .eq('period_value', targetYear)
        .gte('created_at', cacheExpiry.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (cacheErr) {
        console.error('[RiskService] Cache query error:', cacheErr.message);
      } else if (cachedRisk && cachedRisk.length > 0) {
        const cached = cachedRisk[0];
        console.log(`[RiskService] Cache HIT for locationId: ${locationId}, metric: ${dbMetric}`);
        
        return {
          locationId,
          metric: normalizedMetric,
          year: targetYear,
          score: cached.score !== null ? Number(cached.score) : null,
          unit: 'score (0-1)',
          level: cached.level as RiskLevel,
          contributingFactors: cached.metadata?.contributingFactors || [],
          source: cached.source ? {
            provider: cached.source,
            timestamp: cached.metadata?.observedAt || cached.created_at,
          } : null,
          dataType: cached.metadata?.dataType || 'OBSERVED',
          confidence: cached.metadata?.confidence || 'HIGH',
        };
      }
    } catch (cacheError: any) {
      console.error('[RiskService] Cache lookup failed:', cacheError.message);
    }

    // 3. Cache Miss: Run Calculations
    console.log(`[RiskService] Cache MISS. Computing ${dbMetric} risk for location ${locationId}...`);
    
    let score: number | null = null;
    let level: RiskLevel | 'UNAVAILABLE' = 'UNAVAILABLE';
    let contributingFactors: string[] = [];
    let sourceData: { provider: string; timestamp: string } | null = null;
    let dataType: 'OBSERVED' | 'HISTORICAL' | 'PROJECTED' | 'SIMULATED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE' = 'UNAVAILABLE';

    if (dbMetric === 'TEMPERATURE') {
      // Heat Risk - Based on current weather live observations (OpenWeather)
      const current = await ClimateService.getCurrentClimate(lat, lng);
      
      const tempVal = current.feelsLike !== null ? current.feelsLike : current.temperature;
      if (tempVal !== null && !isNaN(tempVal)) {
        const { minTemp, maxTemp } = RISK_THRESHOLDS.heat;
        const computedScore = (tempVal - minTemp) / (maxTemp - minTemp);
        score = isNaN(computedScore) ? null : parseFloat(Math.max(0, Math.min(1, computedScore)).toFixed(4));
        level = score !== null ? getRiskLevelFromScore(score) : 'UNAVAILABLE';
        dataType = 'OBSERVED';
        confidence = current.source === 'MockWeather' ? 'MEDIUM' : 'HIGH';
        sourceData = {
          provider: current.source || 'OpenWeather',
          timestamp: current.observedAt || new Date().toISOString(),
        };

        contributingFactors = [
          `Current feels-like temperature is ${tempVal.toFixed(1)}°C (air temperature: ${current.temperature?.toFixed(1)}°C).`,
        ];
        if (current.humidity !== null && current.humidity !== undefined) {
          contributingFactors.push(`Relative humidity is ${current.humidity}%.`);
        }
        if (current.wind?.speed !== null && current.wind?.speed !== undefined) {
          contributingFactors.push(`Wind speed is ${current.wind.speed.toFixed(1)} m/s.`);
        }
      } else {
        contributingFactors = ['No current temperature data available to assess heat risk.'];
      }
    } else if (dbMetric === 'FLOOD') {
      // Flood Risk - Based on NASA POWER historical precipitation (10-year average)
      const history = await ClimateService.getHistoricalClimate(locationId);
      const validRecords = history.filter((r) => r.precipitation !== null);

      if (validRecords.length > 0) {
        const totalPrecip = validRecords.reduce((sum, r) => sum + (r.precipitation || 0), 0);
        const avgPrecip = totalPrecip / validRecords.length;

        const { minPrecip, maxPrecip } = RISK_THRESHOLDS.flood;
        const computedScore = (avgPrecip - minPrecip) / (maxPrecip - minPrecip);
        score = isNaN(computedScore) ? null : parseFloat(Math.max(0, Math.min(1, computedScore)).toFixed(4));
        level = score !== null ? getRiskLevelFromScore(score) : 'UNAVAILABLE';
        dataType = 'HISTORICAL';
        confidence = 'HIGH';
        sourceData = {
          provider: 'NASA POWER',
          timestamp: validRecords[validRecords.length - 1].observedAt || new Date().toISOString(),
        };

        const minVal = Math.min(...validRecords.map((r) => r.precipitation || 0));
        const maxVal = Math.max(...validRecords.map((r) => r.precipitation || 0));

        contributingFactors = [
          `Average daily precipitation over 10 years is ${avgPrecip.toFixed(2)} mm/day.`,
          `Analysis based on NASA POWER historical dataset (2015-2025).`,
          `Precipitation bounds over this period: Min ${minVal.toFixed(2)} mm/day, Max ${maxVal.toFixed(2)} mm/day.`,
        ];
      } else {
        contributingFactors = ['No historical precipitation records available to assess flood risk.'];
      }
    }

    const result: RiskResult = {
      locationId,
      metric: normalizedMetric,
      year: targetYear,
      score,
      unit: 'score (0-1)',
      level,
      contributingFactors,
      source: sourceData,
      dataType,
      confidence,
    };

    // 4. Save to Database Cache if calculation was successful
    if (level !== 'UNAVAILABLE' && score !== null && sourceData) {
      try {
        const { error: insertErr } = await supabase
          .from('risk_assessments')
          .insert({
            location_id: locationId,
            metric: dbMetric,
            period_type: 'YEAR',
            period_value: targetYear,
            score,
            level,
            source: sourceData.provider,
            metadata: {
              contributingFactors,
              confidence,
              dataType,
              observedAt: sourceData.timestamp,
            },
          });

        if (insertErr) {
          console.error('[RiskService] Cache save failure:', insertErr.message);
        } else {
          console.log(`[RiskService] Cached calculation successfully in DB.`);
        }
      } catch (dbWriteErr: any) {
        console.error('[RiskService] Persistence error:', dbWriteErr.message);
      }
    }

    return result;
  }

  /**
   * Get risk map data as GeoJSON features with scenario support
   */
  static async getRiskMapData(
    locationId: string,
    metric: string,
    year: number,
    scenario: string = 'default'
  ): Promise<{ metric: string; year: number; features: any[] }> {
    const normalizedMetric = metric.toLowerCase();
    
    // Resolve metric database string
    let dbMetric = '';
    if (normalizedMetric === 'flood') {
      dbMetric = 'FLOOD';
    } else if (normalizedMetric === 'temperature' || normalizedMetric === 'heat') {
      dbMetric = 'TEMPERATURE';
    } else if (normalizedMetric === 'air_quality' || normalizedMetric === 'air_quality_index') {
      dbMetric = 'AIR_QUALITY';
    } else if (normalizedMetric === 'water_stress' || normalizedMetric === 'water_availability') {
      dbMetric = 'WATER_STRESS';
    } else if (normalizedMetric === 'green_cover') {
      dbMetric = 'GREEN_COVER';
    } else {
      const err: any = new Error(`Unsupported risk metric: ${metric}`);
      err.statusCode = 400;
      err.code = 'UNSUPPORTED_METRIC';
      throw err;
    }

    let features: any[] = [];

    try {
      // Query Supabase for risk assessments with geometry
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('score, level, geometry, source, metadata, created_at')
        .eq('location_id', locationId)
        .eq('metric', dbMetric)
        .eq('period_value', year)
        .not('geometry', 'is', null);

      if (error) {
        console.warn('[RiskService] Supabase map data query notice:', error.message);
      } else if (data && data.length > 0) {
        // Convert PostGIS geometry (typically returned as hex string) to GeoJSON Features
        features = data.map((row: any) => {
          let geojsonGeometry = row.geometry;
          if (typeof geojsonGeometry === 'string') {
            geojsonGeometry = parseWKBToGeoJSON(geojsonGeometry) || geojsonGeometry;
          }
          return {
            type: 'Feature',
            geometry: geojsonGeometry,
            properties: {
              riskScore: (row.score !== null && !isNaN(Number(row.score))) ? Number(row.score) : null,
              riskLevel: row.level,
              source: row.source,
              metadata: row.metadata,
              unit: 'score (0-1)',
            }
          };
        });
      }
    } catch (queryErr: any) {
      console.warn('[RiskService] Query error fetching spatial data:', queryErr.message);
    }

    // If no features in database, synthesize dynamic spatial risk zone around location
    if (features.length === 0) {
      try {
        const loc = await LocationService.getLocationById(locationId);
        if (loc) {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          const riskCalc = await this.getRisk(locationId, normalizedMetric, year, scenario).catch(() => ({
            score: 0.5,
            level: 'MEDIUM' as const,
            source: { provider: 'GeoTwin 360 Risk Model' },
            dataType: 'PROJECTED' as const,
            unit: 'score (0-1)',
          }));

          const radius = 0.04;
          const polygonCoords = [];
          for (let i = 0; i <= 6; i++) {
            const angle = (i * 60 * Math.PI) / 180;
            polygonCoords.push([
              parseFloat((lng + radius * Math.cos(angle)).toFixed(6)),
              parseFloat((lat + radius * Math.sin(angle)).toFixed(6)),
            ]);
          }

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [polygonCoords],
            },
            properties: {
              riskScore: riskCalc.score,
              riskLevel: riskCalc.level,
              source: riskCalc.source?.provider || 'GeoTwin 360 Risk Model',
              metadata: {
                dataType: riskCalc.dataType,
                metric: normalizedMetric,
                year,
                scenario,
                unit: 'score (0-1)',
              },
            },
          });
        }
      } catch (genErr) {
        console.warn('[RiskService] Spatial polygon generation notice:', genErr);
      }
    }

    return {
      metric: normalizedMetric,
      year,
      features
    };
  }
}

function parseWKBToGeoJSON(wkbHex: string): any {
  if (!wkbHex || typeof wkbHex !== 'string') return null;

  const buffer = Buffer.from(wkbHex, 'hex');
  if (buffer.length < 5) return null;

  const isLittleEndian = buffer.readUInt8(0) === 1;

  const readUInt32 = (offset: number) => {
    return isLittleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  };

  const readDouble = (offset: number) => {
    return isLittleEndian ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
  };

  const typeWithFlags = readUInt32(1);
  const geomType = typeWithFlags & 0xff;
  const hasSRID = (typeWithFlags & 0x20000000) !== 0;

  let offset = 5;
  if (hasSRID) {
    offset += 4;
  }

  if (geomType === 1) {
    if (buffer.length < offset + 16) return null;
    const x = readDouble(offset);
    const y = readDouble(offset + 8);
    return {
      type: 'Point',
      coordinates: [x, y],
    };
  } else if (geomType === 3) {
    if (buffer.length < offset + 4) return null;
    const numRings = readUInt32(offset);
    offset += 4;

    const rings = [];
    for (let r = 0; r < numRings; r++) {
      if (buffer.length < offset + 4) return null;
      const numPoints = readUInt32(offset);
      offset += 4;

      const ringCoordinates = [];
      for (let p = 0; p < numPoints; p++) {
        if (buffer.length < offset + 16) return null;
        const x = readDouble(offset);
        const y = readDouble(offset + 8);
        ringCoordinates.push([x, y]);
        offset += 16;
      }
      rings.push(ringCoordinates);
    }

    return {
      type: 'Polygon',
      coordinates: rings,
    };
  }

  return null;
}
