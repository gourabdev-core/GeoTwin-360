import { supabase } from '../config/supabase.js';
import { PredictionService } from './predictionService.js';
import { ClimateService } from './climateService.js';
import { RiskService } from './riskService.js';
import { LocationService } from './locationService.js';
import { getRiskLevelFromScore, RiskLevel } from '../config/risk.js';

export interface SimulationResult {
  simulationId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  locationId: string;
  targetYear: number;
  scenario: string;
  scenarioName: string;
  baseline: {
    temperature: number | null;
    precipitation: number | null;
    heatRisk: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    floodRisk: RiskLevel | 'UNAVAILABLE';
    floodRiskDetails?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    waterAvailability: number | null;
    waterStress: {
      level: RiskLevel | 'UNAVAILABLE';
      percentage: number | null;
      score: number | null;
    };
    overallRiskScore: number;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  afterSimulation: {
    temperature: number | null;
    precipitation: number | null;
    heatRisk: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    floodRisk: RiskLevel | 'UNAVAILABLE';
    floodRiskDetails?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    waterAvailability: number | null;
    waterStress: {
      level: RiskLevel | 'UNAVAILABLE';
      percentage: number | null;
      score: number | null;
    };
    overallRiskScore: number;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  impact: {
    temperature: number | null;
    precipitation: number | null;
    heatRisk: {
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    floodRisk: {
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    waterStress: {
      deltaPercentage: number;
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    overallRiskScore: {
      before: number;
      after: number;
      change: number;
    };
    waterAvailability: number | null;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  sustainabilityScore: {
    before: number;
    after: number;
    improvement: number;
  };
  provenance: {
    engineVersion: string;
    modelType: string;
    isOfficialForecast: boolean;
    disclaimer: string;
    dataSource: string;
  };
}

interface InterventionImpactConfig {
  temperature: number; // in °C (negative = cooling)
  precipitation: number; // in mm/year (microclimate retention/runoff)
  heatRiskDelta: number; // reduction in heat risk score (0-1)
  floodRiskDelta: number; // reduction in flood risk score (0-1)
  waterStressDelta: number; // reduction in water stress %
  waterAvailability: number; // % increase
  airQualityIndex: number; // AQI reduction (lower is better)
  greenCover: number; // % increase
  co2Emissions: number; // % reduction
}

export const DEFAULT_INTERVENTION_EFFECTS: Record<string, InterventionImpactConfig> = {
  'plant-trees': {
    temperature: -0.5,
    precipitation: 5,
    heatRiskDelta: -0.08,
    floodRiskDelta: -0.06,
    waterStressDelta: -5,
    waterAvailability: 5,
    airQualityIndex: -8,
    greenCover: 8,
    co2Emissions: -3.5,
  },
  'install-solar-panels': {
    temperature: -0.1,
    precipitation: 0,
    heatRiskDelta: -0.02,
    floodRiskDelta: 0,
    waterStressDelta: 0,
    waterAvailability: 0,
    airQualityIndex: -3,
    greenCover: 0,
    co2Emissions: -6.5,
  },
  'rainwater-harvesting': {
    temperature: 0,
    precipitation: 15,
    heatRiskDelta: 0,
    floodRiskDelta: -0.12,
    waterStressDelta: -14,
    waterAvailability: 14,
    airQualityIndex: 0,
    greenCover: 2,
    co2Emissions: 0,
  },
  'cool-roof-initiative': {
    temperature: -0.8,
    precipitation: 0,
    heatRiskDelta: -0.12,
    floodRiskDelta: 0,
    waterStressDelta: 0,
    waterAvailability: 0,
    airQualityIndex: -2,
    greenCover: 0,
    co2Emissions: -1.2,
  },
  'cool-roofs': {
    temperature: -0.8,
    precipitation: 0,
    heatRiskDelta: -0.12,
    floodRiskDelta: 0,
    waterStressDelta: 0,
    waterAvailability: 0,
    airQualityIndex: -2,
    greenCover: 0,
    co2Emissions: -1.2,
  },
  'electric-public-transport': {
    temperature: -0.1,
    precipitation: 0,
    heatRiskDelta: -0.02,
    floodRiskDelta: 0,
    waterStressDelta: 0,
    waterAvailability: 0,
    airQualityIndex: -16,
    greenCover: 0,
    co2Emissions: -5.0,
  },
};

export const SCENARIO_NAMES: Record<string, string> = {
  default: 'Baseline Scenario',
  resilience: 'Resilience Plan 2035',
  accelerated: 'Accelerated Emissions',
};

export class SimulationService {
  private static readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  /**
   * Resolve coordinates and find or create a default system user.
   */
  private static async ensureSystemUser(): Promise<string> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', this.SYSTEM_USER_ID)
        .maybeSingle();

      if (user) {
        return user.id;
      }

      const { error: insertErr } = await supabase.from('users').insert({
        id: this.SYSTEM_USER_ID,
        name: 'System User',
        email: 'system@geotwin360.com',
        role: 'USER',
      });

      if (insertErr) {
        console.warn('[SimulationService] Error creating system user:', insertErr.message);
      }
    } catch (e: any) {
      console.warn('[SimulationService] User table unavailable, using fallback ID:', e.message);
    }

    return this.SYSTEM_USER_ID;
  }

  /**
   * Find or create a scenario record to satisfy database constraints.
   */
  private static async ensureScenario(userId: string, locationId: string, year: number, scenarioKey: string): Promise<string> {
    try {
      const scenarioName = `${SCENARIO_NAMES[scenarioKey] || 'Custom'} - Year ${year}`;
      const { data: scenario } = await supabase
        .from('scenarios')
        .select('id')
        .eq('location_id', locationId)
        .eq('target_year', year)
        .eq('user_id', userId)
        .maybeSingle();

      if (scenario) {
        return scenario.id;
      }

      const { data: newScenario } = await supabase
        .from('scenarios')
        .insert({
          user_id: userId,
          location_id: locationId,
          name: scenarioName,
          target_year: year,
          status: 'SIMULATED',
        })
        .select()
        .single();

      if (newScenario) {
        return newScenario.id;
      }
    } catch (e: any) {
      console.warn('[SimulationService] Scenarios table unavailable, using fallback ID:', e.message);
    }

    return `scen-${locationId}-${year}-${scenarioKey}`;
  }

  /**
   * Run simulation on selected interventions for a given location, year, and scenario.
   */
  static async runSimulation(
    locationId: string,
    targetYear: number,
    interventionSlugs: string[],
    scenario: string = 'default'
  ): Promise<SimulationResult> {
    const activeScenario = scenario in SCENARIO_NAMES ? scenario : 'default';
    const activeScenarioName = SCENARIO_NAMES[activeScenario];

    // 1. Verify location & extract coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const location = await LocationService.getLocationById(locationId);
      if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        lat = Number(location.latitude);
        lng = Number(location.longitude);
      }
    } catch {
      // Check if locationId has synthetic coordinates
      const locMatch = locationId.match(/(-?\d+(?:\.\d+)?)[-_](-?\d+(?:\.\d+)?)/);
      if (locMatch) {
        lat = parseFloat(locMatch[1]);
        lng = parseFloat(locMatch[2]);
      }
    }

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      const err: any = new Error('Location could not be found for simulation.');
      err.statusCode = 404;
      err.code = 'LOCATION_NOT_FOUND';
      throw err;
    }

    const isKolkata = Math.abs(lat - 22.5726) < 0.5 && Math.abs(lng - 88.3638) < 0.5;

    // 2. Setup user and scenario for DB foreign keys (resilient)
    const userId = await this.ensureSystemUser();
    const scenarioId = await this.ensureScenario(userId, locationId, targetYear, activeScenario);

    // 3. Retrieve baseline climate temperature & precipitation
    let baselineTemp: number | null = null;
    let baselinePrecip: number | null = null;

    if (targetYear > 2026) {
      try {
        const projection = await PredictionService.getProjectionForYear(locationId, targetYear, activeScenario as any);
        if (projection?.temperature !== null && projection?.temperature !== undefined) {
          baselineTemp = projection.temperature;
        }
        if (projection?.precipitation !== null && projection?.precipitation !== undefined) {
          baselinePrecip = projection.precipitation;
        }
      } catch (err: any) {
        console.warn(`[SimulationService] Prediction engine projection unavailable for ${targetYear}:`, err.message);
      }
    } else {
      try {
        const history = await ClimateService.getHistoricalClimate(locationId);
        const validTemps = history.filter((r) => r.temperature !== null);
        baselineTemp = validTemps.length > 0
          ? validTemps.reduce((sum, r) => sum + (r.temperature || 0), 0) / validTemps.length
          : null;
        const validPrecips = history.filter((r) => r.precipitation !== null);
        baselinePrecip = validPrecips.length > 0
          ? validPrecips.reduce((sum, r) => sum + (r.precipitation || 0), 0) / validPrecips.length
          : null;
      } catch (err: any) {
        console.warn('[SimulationService] Historical climate baseline unavailable:', err.message);
      }
    }

    // Deterministic fallback calculations based on coordinates, target year, and scenario
    if (baselineTemp === null) {
      const base = isKolkata ? 26.8 : Math.max(5, 30 - Math.abs(lat) * 0.45);
      const warmingRate = targetYear > 2024 ? (targetYear - 2024) * 0.04 : 0;
      const scenarioOffset = activeScenario === 'resilience' ? -0.4 : activeScenario === 'accelerated' ? 0.7 : 0;
      baselineTemp = parseFloat((base + warmingRate + scenarioOffset).toFixed(1));
    }

    if (baselinePrecip === null) {
      const basePrecip = isKolkata ? 1620 : Math.round(Math.max(300, 1800 - Math.abs(lat) * 18));
      const scenarioPrecipOffset = activeScenario === 'resilience' ? 10 : activeScenario === 'accelerated' ? -40 : 0;
      baselinePrecip = basePrecip + scenarioPrecipOffset;
    }

    // 4. Retrieve or compute baseline Flood Risk
    let baselineFloodRiskScore: number = 0.25;
    let baselineFloodRiskLevel: RiskLevel = 'LOW';
    try {
      const floodResult = await RiskService.getRisk(locationId, 'flood', targetYear, activeScenario);
      if (floodResult.score !== null) {
        baselineFloodRiskScore = floodResult.score;
        baselineFloodRiskLevel = floodResult.level !== 'UNAVAILABLE' ? floodResult.level : getRiskLevelFromScore(baselineFloodRiskScore);
      }
    } catch {
      const baseFlood = isKolkata ? 0.45 : 0.25;
      const scenarioFloodOffset = activeScenario === 'resilience' ? -0.12 : activeScenario === 'accelerated' ? 0.15 : 0;
      baselineFloodRiskScore = Math.max(0.05, Math.min(0.95, parseFloat((baseFlood + scenarioFloodOffset).toFixed(2))));
      baselineFloodRiskLevel = getRiskLevelFromScore(baselineFloodRiskScore);
    }

    // 5. Compute baseline Environmental & Water Indicators
    const baseWaterAvail = isKolkata ? 58 : Math.max(25, Math.min(85, Math.round(60 - Math.abs(lat) * 0.3)));
    const scenarioWaterAvailOffset = activeScenario === 'resilience' ? 12 : activeScenario === 'accelerated' ? -12 : 0;
    const baselineWaterAvailability = Math.max(10, Math.min(95, baseWaterAvail + scenarioWaterAvailOffset));

    const baselineWaterStressPct = 100 - baselineWaterAvailability;
    const baselineWaterStressScore = parseFloat((baselineWaterStressPct / 100).toFixed(2));
    const baselineWaterStressLevel = getRiskLevelFromScore(baselineWaterStressScore);

    const baseAqi = isKolkata ? 112 : Math.max(35, Math.min(160, Math.round(50 + Math.abs(lat) * 1.5)));
    const scenarioAqiOffset = activeScenario === 'resilience' ? -15 : activeScenario === 'accelerated' ? 25 : 0;
    const baselineAirQualityIndex = Math.max(20, baseAqi + scenarioAqiOffset);

    const baseGreen = isKolkata ? 34 : Math.max(15, Math.min(75, Math.round(40 - Math.abs(lat) * 0.2)));
    const scenarioGreenOffset = activeScenario === 'resilience' ? 10 : activeScenario === 'accelerated' ? -8 : 0;
    const baselineGreenCover = Math.max(5, Math.min(95, baseGreen + scenarioGreenOffset));

    const baseCo2 = isKolkata ? 3.8 : 2.4;
    const scenarioCo2Offset = activeScenario === 'resilience' ? -1.8 : activeScenario === 'accelerated' ? 2.5 : 0;
    const baselineCo2Emissions = parseFloat((baseCo2 + scenarioCo2Offset).toFixed(1));

    // Baseline Heat Risk
    const baselineHeatRiskScore = Math.max(0, Math.min(1, parseFloat(((baselineTemp - 18) / 22).toFixed(2))));
    const baselineHeatRiskLevel = getRiskLevelFromScore(baselineHeatRiskScore);

    // Baseline Overall Risk Score (0 - 100)
    const baselineOverallRiskScore = Math.round(
      (baselineHeatRiskScore * 0.30 +
        baselineFloodRiskScore * 0.30 +
        baselineWaterStressScore * 0.25 +
        (baselineAirQualityIndex / 250) * 0.15) * 100
    );

    // 6. Calculate cumulative impact from selected interventions
    let deltaTemp = 0;
    let deltaPrecip = 0;
    let deltaHeatRisk = 0;
    let deltaFloodRisk = 0;
    let deltaWaterStress = 0;
    let deltaWater = 0;
    let deltaAqi = 0;
    let deltaGreen = 0;
    let deltaCo2 = 0;

    for (const slug of interventionSlugs) {
      const effect = DEFAULT_INTERVENTION_EFFECTS[slug];
      if (effect) {
        deltaTemp += effect.temperature;
        deltaPrecip += effect.precipitation;
        deltaHeatRisk += effect.heatRiskDelta;
        deltaFloodRisk += effect.floodRiskDelta;
        deltaWaterStress += effect.waterStressDelta;
        deltaWater += effect.waterAvailability;
        deltaAqi += effect.airQualityIndex;
        deltaGreen += effect.greenCover;
        deltaCo2 += effect.co2Emissions;
      }
    }

    // 7. Compute After-Simulation values
    const simulatedTemp = parseFloat((baselineTemp + deltaTemp).toFixed(1));
    const simulatedPrecip = Math.round(baselinePrecip + deltaPrecip);

    const simulatedHeatRiskScore = Math.max(0, Math.min(1, parseFloat((baselineHeatRiskScore + deltaHeatRisk).toFixed(2))));
    const simulatedHeatRiskLevel = getRiskLevelFromScore(simulatedHeatRiskScore);

    const simulatedFloodRiskScore = Math.max(0, Math.min(1, parseFloat((baselineFloodRiskScore + deltaFloodRisk).toFixed(2))));
    const simulatedFloodRiskLevel = getRiskLevelFromScore(simulatedFloodRiskScore);

    const simulatedWaterAvailability = Math.min(100, Math.max(0, baselineWaterAvailability + deltaWater));
    const simulatedWaterStressPct = Math.max(0, Math.min(100, 100 - simulatedWaterAvailability));
    const simulatedWaterStressScore = parseFloat((simulatedWaterStressPct / 100).toFixed(2));
    const simulatedWaterStressLevel = getRiskLevelFromScore(simulatedWaterStressScore);

    const simulatedAirQualityIndex = Math.max(15, baselineAirQualityIndex + deltaAqi);
    const simulatedGreenCover = Math.min(100, Math.max(0, baselineGreenCover + deltaGreen));
    const simulatedCo2Emissions = parseFloat((baselineCo2Emissions + deltaCo2).toFixed(1));

    // Simulated Overall Risk Score
    const simulatedOverallRiskScore = Math.round(
      (simulatedHeatRiskScore * 0.30 +
        simulatedFloodRiskScore * 0.30 +
        simulatedWaterStressScore * 0.25 +
        (simulatedAirQualityIndex / 250) * 0.15) * 100
    );
    const overallRiskChange = simulatedOverallRiskScore - baselineOverallRiskScore;

    // 8. Calculate Sustainability Scores
    const baselineSustainabilityScore = Math.min(90, Math.max(20, Math.round(
      (100 - (baselineTemp - 20) * 3) * 0.3 +
      (100 - baselineAirQualityIndex * 0.4) * 0.25 +
      baselineWaterAvailability * 0.25 +
      baselineGreenCover * 0.2
    )));

    const scoreBoost = Math.round(
      Math.abs(deltaTemp) * 8 +
      deltaWater * 0.3 +
      Math.abs(deltaAqi) * 0.3 +
      deltaGreen * 0.5 +
      Math.abs(deltaCo2) * 0.8
    );

    const simulatedSustainabilityScore = Math.min(98, baselineSustainabilityScore + scoreBoost);
    const improvementScore = simulatedSustainabilityScore - baselineSustainabilityScore;

    // 9. Resiliently persist in database (swallows error if tables missing)
    const simulationRunId = `sim-${Date.now()}`;
    try {
      await supabase.from('simulation_runs').insert({
        id: simulationRunId,
        scenario_id: scenarioId,
        user_id: userId,
        location_id: locationId,
        target_year: targetYear,
        status: 'COMPLETED',
        engine_version: '2.0',
        input_snapshot: {
          scenario: activeScenario,
          interventions: interventionSlugs,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      await supabase.from('simulation_results').insert([
        {
          simulation_run_id: simulationRunId,
          metric: 'temperature',
          baseline_value: baselineTemp,
          simulated_value: simulatedTemp,
          delta_value: parseFloat(deltaTemp.toFixed(1)),
        },
        {
          simulation_run_id: simulationRunId,
          metric: 'precipitation',
          baseline_value: baselinePrecip,
          simulated_value: simulatedPrecip,
          delta_value: deltaPrecip,
        },
        {
          simulation_run_id: simulationRunId,
          metric: 'overall_risk',
          baseline_value: baselineOverallRiskScore,
          simulated_value: simulatedOverallRiskScore,
          delta_value: overallRiskChange,
        },
      ]);

      await supabase.from('sustainability_scores').insert([
        {
          simulation_run_id: simulationRunId,
          location_id: locationId,
          score_type: 'BASELINE',
          overall_score: baselineSustainabilityScore,
        },
        {
          simulation_run_id: simulationRunId,
          location_id: locationId,
          score_type: 'SIMULATED',
          overall_score: simulatedSustainabilityScore,
        },
      ]);
    } catch {
      // Persistence warning only, continue seamlessly
    }

    // 10. Construct and return final complete SimulationResult
    return {
      simulationId: simulationRunId,
      status: 'COMPLETED',
      locationId,
      targetYear,
      scenario: activeScenario,
      scenarioName: activeScenarioName,
      baseline: {
        temperature: baselineTemp,
        precipitation: baselinePrecip,
        heatRisk: {
          level: baselineHeatRiskLevel,
          score: baselineHeatRiskScore,
        },
        floodRisk: baselineFloodRiskLevel,
        floodRiskDetails: {
          level: baselineFloodRiskLevel,
          score: baselineFloodRiskScore,
        },
        waterAvailability: baselineWaterAvailability,
        waterStress: {
          level: baselineWaterStressLevel,
          percentage: baselineWaterStressPct,
          score: baselineWaterStressScore,
        },
        overallRiskScore: baselineOverallRiskScore,
        airQualityIndex: baselineAirQualityIndex,
        greenCover: baselineGreenCover,
        co2Emissions: baselineCo2Emissions,
      },
      afterSimulation: {
        temperature: simulatedTemp,
        precipitation: simulatedPrecip,
        heatRisk: {
          level: simulatedHeatRiskLevel,
          score: simulatedHeatRiskScore,
        },
        floodRisk: simulatedFloodRiskLevel,
        floodRiskDetails: {
          level: simulatedFloodRiskLevel,
          score: simulatedFloodRiskScore,
        },
        waterAvailability: simulatedWaterAvailability,
        waterStress: {
          level: simulatedWaterStressLevel,
          percentage: simulatedWaterStressPct,
          score: simulatedWaterStressScore,
        },
        overallRiskScore: simulatedOverallRiskScore,
        airQualityIndex: simulatedAirQualityIndex,
        greenCover: simulatedGreenCover,
        co2Emissions: simulatedCo2Emissions,
      },
      impact: {
        temperature: parseFloat(deltaTemp.toFixed(1)),
        precipitation: deltaPrecip,
        heatRisk: {
          deltaScore: parseFloat((simulatedHeatRiskScore - baselineHeatRiskScore).toFixed(2)),
          fromLevel: baselineHeatRiskLevel,
          toLevel: simulatedHeatRiskLevel,
        },
        floodRisk: {
          deltaScore: parseFloat((simulatedFloodRiskScore - baselineFloodRiskScore).toFixed(2)),
          fromLevel: baselineFloodRiskLevel,
          toLevel: simulatedFloodRiskLevel,
        },
        waterStress: {
          deltaPercentage: simulatedWaterStressPct - baselineWaterStressPct,
          deltaScore: parseFloat((simulatedWaterStressScore - baselineWaterStressScore).toFixed(2)),
          fromLevel: baselineWaterStressLevel,
          toLevel: simulatedWaterStressLevel,
        },
        overallRiskScore: {
          before: baselineOverallRiskScore,
          after: simulatedOverallRiskScore,
          change: overallRiskChange,
        },
        waterAvailability: deltaWater,
        airQualityIndex: deltaAqi,
        greenCover: deltaGreen,
        co2Emissions: parseFloat(deltaCo2.toFixed(1)),
      },
      sustainabilityScore: {
        before: baselineSustainabilityScore,
        after: simulatedSustainabilityScore,
        improvement: improvementScore,
      },
      provenance: {
        engineVersion: '2.0',
        modelType: 'DETERMINISTIC_SCENARIO_SIMULATION',
        isOfficialForecast: false,
        disclaimer:
          'Calculated scenario simulation based on deterministic rule models and empirical trend extrapolation. Not an official scientific GCM forecast.',
        dataSource: 'NASA POWER / Open-Meteo / GeoTwin Rule Engine',
      },
    };
  }
}
