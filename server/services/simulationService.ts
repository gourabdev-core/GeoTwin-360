import { supabase } from '../config/supabase.js';
import { PredictionService } from './predictionService.js';
import { ClimateService } from './climateService.js';
import { RiskService } from './riskService.js';
import { LocationService } from './locationService.js';
import { RISK_THRESHOLDS, getRiskLevelFromScore, RiskLevel } from '../config/risk.js';

export interface SimulationResult {
  simulationId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  locationId: string;
  targetYear: number;
  baseline: {
    temperature: number | null;
    floodRisk: RiskLevel | 'UNAVAILABLE';
    waterAvailability: number | null;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  afterSimulation: {
    temperature: number | null;
    floodRisk: RiskLevel | 'UNAVAILABLE';
    waterAvailability: number | null;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  impact: {
    temperature: number | null;
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
}

export class SimulationService {
  private static readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  /**
   * Resolve coordinates and find or create a default system user.
   */
  private static async ensureSystemUser(): Promise<string> {
    const { data: user, error: selectErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', this.SYSTEM_USER_ID)
      .maybeSingle();

    if (selectErr) {
      console.error('[SimulationService] Error checking user:', selectErr.message);
    }

    if (!user) {
      console.log('[SimulationService] System user not found, inserting default user...');
      const { error: insertErr } = await supabase.from('users').insert({
        id: this.SYSTEM_USER_ID,
        name: 'System User',
        email: 'system@geotwin360.com',
        role: 'USER',
      });

      if (insertErr) {
        console.error('[SimulationService] Error creating system user:', insertErr.message);
      }
    }

    return this.SYSTEM_USER_ID;
  }

  /**
   * Find or create a scenario record to satisfy database constraints.
   */
  private static async ensureScenario(userId: string, locationId: string, year: number): Promise<string> {
    const { data: scenario, error: selectErr } = await supabase
      .from('scenarios')
      .select('id')
      .eq('location_id', locationId)
      .eq('target_year', year)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectErr) {
      console.error('[SimulationService] Error checking scenario:', selectErr.message);
    }

    if (scenario) {
      return scenario.id;
    }

    const { data: newScenario, error: scenErr } = await supabase
      .from('scenarios')
      .insert({
        user_id: userId,
        location_id: locationId,
        name: `Simulation Scenario - Year ${year}`,
        target_year: year,
        status: 'SIMULATED',
      })
      .select()
      .single();

    if (scenErr) {
      console.error('[SimulationService] Error creating scenario:', scenErr.message);
      throw scenErr;
    }

    return newScenario.id;
  }

  /**
   * Run simulation on selected interventions for a given location and year.
   */
  static async runSimulation(
    locationId: string,
    targetYear: number,
    interventionSlugs: string[]
  ): Promise<SimulationResult> {
    // 1. Verify location
    const location = await LocationService.getLocationById(locationId);

    // 2. Setup user and scenario for DB foreign keys
    const userId = await this.ensureSystemUser();
    const scenarioId = await this.ensureScenario(userId, locationId, targetYear);

    // 3. Query selected interventions
    const { data: interventions, error: intErr } = await supabase
      .from('interventions')
      .select('*')
      .in('slug', interventionSlugs);

    if (intErr) {
      console.error('[SimulationService] Error querying interventions:', intErr.message);
    }

    // 4. Retrieve baseline climate temperature
    let baselineTemp: number | null = null;
    if (targetYear > 2026) {
      try {
        const projection = await PredictionService.getProjectionForYear(locationId, targetYear);
        baselineTemp = projection?.temperature ?? null;
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
      } catch (err: any) {
        console.warn('[SimulationService] Historical climate baseline unavailable:', err.message);
      }
    }

    // 5. Retrieve baseline flood risk
    let baselineFloodRiskScore: number | null = null;
    let baselineFloodRiskLevel: RiskLevel | 'UNAVAILABLE' = 'UNAVAILABLE';
    try {
      const floodResult = await RiskService.getRisk(locationId, 'flood', targetYear);
      baselineFloodRiskScore = floodResult.score;
      baselineFloodRiskLevel = floodResult.level;
    } catch (err: any) {
      console.warn('[SimulationService] Flood risk baseline unavailable:', err.message);
    }

    // 6. Retrieve baseline heat risk
    let baselineHeatRiskScore: number | null = null;
    try {
      const heatResult = await RiskService.getRisk(locationId, 'temperature', targetYear);
      baselineHeatRiskScore = heatResult.score;
    } catch (err: any) {
      console.warn('[SimulationService] Heat risk baseline unavailable:', err.message);
    }

    // 7. Calculate Simulated Temperature
    let deltaTemp = 0;
    for (const int of interventions || []) {
      const params = int.default_parameters;
      if (params && params.temperature) {
        const impact = Number(params.temperature.impact);
        const direction = params.temperature.direction;
        if (direction === 'decrease') {
          deltaTemp -= impact;
        } else if (direction === 'increase') {
          deltaTemp += impact;
        }
      }
    }

    let simulatedTemp: number | null = null;
    if (baselineTemp !== null) {
      simulatedTemp = parseFloat((baselineTemp + deltaTemp).toFixed(2));
    }

    // 8. Calculate Simulated Heat Risk Score and Level
    let simulatedHeatRiskScore = baselineHeatRiskScore;
    if (simulatedTemp !== null) {
      const { minTemp, maxTemp } = RISK_THRESHOLDS.heat;
      const computedScore = (simulatedTemp - minTemp) / (maxTemp - minTemp);
      simulatedHeatRiskScore = parseFloat(Math.max(0, Math.min(1, computedScore)).toFixed(4));
    }

    // 9. Calculate Sustainability Scores (Resilience = (1 - RiskScore) * 100)
    let baselineHeatResilience: number | null = null;
    if (baselineHeatRiskScore !== null) {
      baselineHeatResilience = (1 - baselineHeatRiskScore) * 100;
    }
    let baselineFloodResilience: number | null = null;
    if (baselineFloodRiskScore !== null) {
      baselineFloodResilience = (1 - baselineFloodRiskScore) * 100;
    }

    let baselineOverallScore = 0;
    let baselineCount = 0;
    if (baselineHeatResilience !== null) {
      baselineOverallScore += baselineHeatResilience;
      baselineCount++;
    }
    if (baselineFloodResilience !== null) {
      baselineOverallScore += baselineFloodResilience;
      baselineCount++;
    }
    const overallBefore = baselineCount > 0 ? Math.round(baselineOverallScore / baselineCount) : 0;

    let simulatedHeatResilience: number | null = null;
    if (simulatedHeatRiskScore !== null) {
      simulatedHeatResilience = (1 - simulatedHeatRiskScore) * 100;
    }
    let simulatedFloodResilience = baselineFloodResilience;

    let simulatedOverallScore = 0;
    let simulatedCount = 0;
    if (simulatedHeatResilience !== null) {
      simulatedOverallScore += simulatedHeatResilience;
      simulatedCount++;
    }
    if (simulatedFloodResilience !== null) {
      simulatedOverallScore += simulatedFloodResilience;
      simulatedCount++;
    }
    const overallAfter = simulatedCount > 0 ? Math.round(simulatedOverallScore / simulatedCount) : 0;
    const overallImprovement = overallAfter - overallBefore;

    // 10. Persist simulation run in database
    const { data: run, error: runErr } = await supabase
      .from('simulation_runs')
      .insert({
        scenario_id: scenarioId,
        user_id: userId,
        location_id: locationId,
        target_year: targetYear,
        status: 'COMPLETED',
        engine_version: '1.0',
        input_snapshot: { interventions: interventionSlugs },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runErr) {
      console.error('[SimulationService] Error creating simulation run:', runErr.message);
      throw runErr;
    }

    // 11. Persist results in simulation_results
    const resultsToInsert: any[] = [];
    if (baselineTemp !== null && simulatedTemp !== null) {
      resultsToInsert.push({
        simulation_run_id: run.id,
        metric: 'temperature',
        baseline_value: baselineTemp,
        simulated_value: simulatedTemp,
        delta_value: parseFloat((simulatedTemp - baselineTemp).toFixed(2)),
        unit: 'C',
        direction: deltaTemp < 0 ? 'IMPROVEMENT' : (deltaTemp > 0 ? 'REGRESSION' : 'NEUTRAL'),
      });
    }

    if (baselineFloodRiskScore !== null) {
      resultsToInsert.push({
        simulation_run_id: run.id,
        metric: 'flood',
        baseline_value: baselineFloodRiskScore,
        simulated_value: baselineFloodRiskScore,
        delta_value: 0,
        unit: 'score',
        direction: 'NEUTRAL',
      });
    }

    if (resultsToInsert.length > 0) {
      const { error: resErr } = await supabase.from('simulation_results').insert(resultsToInsert);
      if (resErr) {
        console.error('[SimulationService] Error creating simulation results:', resErr.message);
      }
    }

    // 12. Persist sustainability scores in database
    const { error: scoreErr } = await supabase.from('sustainability_scores').insert([
      {
        simulation_run_id: run.id,
        score_type: 'BASELINE',
        overall_score: overallBefore,
        heat_score: baselineHeatResilience,
        flood_score: baselineFloodResilience,
      },
      {
        simulation_run_id: run.id,
        score_type: 'SIMULATED',
        overall_score: overallAfter,
        heat_score: simulatedHeatResilience,
        flood_score: simulatedFloodResilience,
      },
    ]);

    if (scoreErr) {
      console.error('[SimulationService] Error inserting sustainability scores:', scoreErr.message);
    }

    // 13. Construct and return final SimulationResult
    return {
      simulationId: run.id,
      status: 'COMPLETED',
      locationId,
      targetYear,
      baseline: {
        temperature: baselineTemp,
        floodRisk: baselineFloodRiskLevel,
        waterAvailability: null,
        airQualityIndex: null,
        greenCover: null,
        co2Emissions: null,
      },
      afterSimulation: {
        temperature: simulatedTemp,
        floodRisk: baselineFloodRiskLevel, // unchanged
        waterAvailability: null,
        airQualityIndex: null,
        greenCover: null,
        co2Emissions: null,
      },
      impact: {
        temperature: simulatedTemp !== null && baselineTemp !== null ? parseFloat((simulatedTemp - baselineTemp).toFixed(2)) : null,
        waterAvailability: null,
        airQualityIndex: null,
        greenCover: null,
        co2Emissions: null,
      },
      sustainabilityScore: {
        before: overallBefore,
        after: overallAfter,
        improvement: overallImprovement,
      },
    };
  }
}
