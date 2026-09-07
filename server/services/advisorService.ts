import { GeminiService } from './geminiService.js';
import { GeminiSafetyGuard } from './geminiSafetyGuard.js';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ClimateService } from './climateService.js';
import { PredictionService, SCENARIO_DEFINITIONS } from './predictionService.js';
import { RiskService } from './riskService.js';
import { LocationService } from './locationService.js';
import { supabase } from '../config/supabase.js';
import type { SimulationResult } from './simulationService.js';
import type { ScenarioType } from '../types/prediction.js';

/**
 * AI Advisor Service for GeoTwin 360
 *
 * Provides a secure, server-side qualitative reasoning and decision-support
 * interpretation layer powered by Google Gemini.
 *
 * Strict Rules:
 * - Gemini NEVER invents numerical climate measurements or risk figures.
 * - Gemini receives only structured, verified environmental facts.
 * - Real API calls are strictly guarded by Zero-Quota architecture.
 * - Zero private user information is ever sent to Gemini.
 * - Output must strictly distinguish:
 *     1. Supplied Data (satellite & telemetry observations)
 *     2. Calculated Values (statistical regression & composite indices)
 *     3. Assumptions (scenario emissions pathways)
 *     4. Recommendations (urban resilience strategies)
 * - Schema validation is enforced on all AI outputs.
 * - Graceful fallback is guaranteed if Gemini is unreachable or rate-limited.
 */

export interface AIRecommendation {
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  targetRisks: string[];
  expectedImpact: string;
  nextStep: string;
}

export interface AIDataDistinction {
  suppliedData: string[];
  calculatedValues: string[];
  assumptions: string[];
  recommendations: string[];
}

export interface AIAdvisorResponse {
  // 7 Core Generated Outputs
  climateExplanation: string;
  mainRisks: string[];
  riskSignificance: string;
  recommendedActions: AIRecommendation[];
  shortTermRecommendations: string[];
  longTermRecommendations: string[];
  confidenceLimitations: string;

  // Data Provenance & Distinction
  dataDistinction: AIDataDistinction;
  isFallback: boolean;
  fallbackReason?: string;
  analysisType: 'AI_GENERATED' | 'SYSTEM_MODEL_BASED' | 'MOCKED_AI';
  errorCode?: string;

  // Backward-compatibility aliases
  summary: string;
  keyProblems: string[];
  recommendations: AIRecommendation[];
  interventionPriorities: string[];

  model: {
    provider: string;
    name: string;
  };
  dataContext: {
    locationName: string;
    targetYear: number;
    scenario: string;
    hasSimulationData: boolean;
    hasCurrentClimate: boolean;
    hasPredictionData: boolean;
    hasRiskData: boolean;
  };
}

export interface ClimateContext {
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  targetYear: number;
  scenario: {
    id: string;
    name: string;
    tag: string;
    description: string;
    radiativeForcing: string;
    assumptions: string[];
  };
  currentClimate: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    description: string | null;
    aqi: number | null;
  } | null;
  historicalData: Array<{
    year: number;
    temperature: number | null;
    precipitation: number | null;
  }> | null;
  predictions: {
    temperature: number | null;
    precipitation: number | null;
    confidence: number | null;
    anomaly: number | null;
  } | null;
  risks: {
    heat: { score: number | null; level: string; dataType: string } | null;
    flood: { score: number | null; level: string; dataType: string } | null;
    composite: { score: number | null; level: string; primaryDriver: string } | null;
  };
  resilience: {
    before: number;
    after: number;
    improvement: number;
  } | null;
  simulation: {
    baseline: SimulationResult['baseline'];
    afterSimulation: SimulationResult['afterSimulation'];
    impact: SimulationResult['impact'];
  } | null;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Strict Zod schema for structured Gemini output validation
const advisorResponseZodSchema = z.object({
  climateExplanation: z.string().min(10, 'Climate explanation must be at least 10 characters'),
  mainRisks: z.array(z.string().min(3)).min(1, 'At least one main risk must be identified'),
  riskSignificance: z.string().min(10, 'Risk significance must be at least 10 characters'),
  recommendedActions: z.array(
    z.object({
      title: z.string().min(3),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
      reason: z.string().min(5),
      targetRisks: z.array(z.string()).default([]),
      expectedImpact: z.string().min(5),
      nextStep: z.string().min(5),
    })
  ).min(1, 'At least one recommendation must be provided'),
  shortTermRecommendations: z.array(z.string().min(5)).min(1, 'At least one short-term action is required'),
  longTermRecommendations: z.array(z.string().min(5)).min(1, 'At least one long-term action is required'),
  confidenceLimitations: z.string().min(10, 'Confidence/limitations statement is required'),
  dataDistinction: z.object({
    suppliedData: z.array(z.string()).default([]),
    calculatedValues: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    recommendations: z.array(z.string()).default([]),
  }).default({
    suppliedData: [],
    calculatedValues: [],
    assumptions: [],
    recommendations: [],
  }),
});

export class AdvisorService {

  /**
   * Gather verified, non-private climate context from GeoTwin domain services.
   */
  public static async gatherContext(
    locationId: string,
    targetYear: number,
    scenarioName: string = 'default',
    simulationId?: string
  ): Promise<ClimateContext> {
    const location = await LocationService.getLocationById(locationId);

    const activeScenarioDef =
      SCENARIO_DEFINITIONS[scenarioName as ScenarioType] || SCENARIO_DEFINITIONS.default;

    const context: ClimateContext = {
      locationName: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      targetYear,
      scenario: {
        id: activeScenarioDef.id,
        name: activeScenarioDef.name,
        tag: activeScenarioDef.tag,
        description: activeScenarioDef.description,
        radiativeForcing: activeScenarioDef.radiativeForcing,
        assumptions: activeScenarioDef.assumptions,
      },
      currentClimate: null,
      historicalData: null,
      predictions: null,
      risks: { heat: null, flood: null, composite: null },
      resilience: null,
      simulation: null,
    };

    // 1. Current live climate telemetry (OpenWeather & OpenMeteo)
    try {
      const climate = await ClimateService.getCurrentClimate(location.latitude, location.longitude);
      context.currentClimate = {
        temperature: climate.temperature ?? null,
        humidity: climate.humidity ?? null,
        windSpeed: climate.windSpeed ?? climate.wind?.speed ?? null,
        description: climate.description ?? null,
        aqi: climate.aqi ?? null,
      };
    } catch (err: any) {
      console.warn('[AdvisorService] Current climate data unavailable:', err.message);
    }

    // 2. Historical data (NASA POWER satellite baseline 2015-2025)
    try {
      const historical = await ClimateService.getHistoricalClimate(locationId);
      if (historical && historical.length > 0) {
        context.historicalData = historical.map((h) => ({
          year: h.year ?? new Date(h.observedAt).getUTCFullYear(),
          temperature: h.temperature ?? null,
          precipitation: h.precipitation ?? null,
        }));
      }
    } catch (err: any) {
      console.warn('[AdvisorService] Historical data unavailable:', err.message);
    }

    // 3. Climate Projections for target year (linear regression + scenario modulation)
    try {
      const analysis = await PredictionService.getClimateAnalysis(
        locationId,
        targetYear,
        (scenarioName as ScenarioType) || 'default',
        false
      );
      if (analysis && analysis.indicators) {
        const tempTrend = analysis.indicators.temperatureTrend;
        const precipTrend = analysis.indicators.precipitationTrend;
        const overallRisk = analysis.indicators.overallRisk;

        context.predictions = {
          temperature: typeof tempTrend?.value === 'number' ? tempTrend.value : null,
          precipitation: typeof precipTrend?.value === 'number' ? precipTrend.value : null,
          confidence: typeof tempTrend?.rSquared === 'number' ? tempTrend.rSquared : null,
          anomaly: typeof tempTrend?.anomaly === 'number' ? tempTrend.anomaly : null,
        };

        if (overallRisk) {
          context.risks.composite = {
            score: typeof overallRisk.score === 'number' ? overallRisk.score : null,
            level: overallRisk.level || 'MODERATE',
            primaryDriver: overallRisk.primaryDriver || 'Climate Variability',
          };
        }
      }
    } catch (err: any) {
      console.warn('[AdvisorService] Prediction data unavailable:', err.message);
    }

    // 4. Specific Risk Assessments
    try {
      const heatRisk = await RiskService.getRisk(locationId, 'temperature', targetYear);
      context.risks.heat = {
        score: heatRisk.score,
        level: heatRisk.level,
        dataType: heatRisk.dataType,
      };
    } catch (err: any) {
      console.warn('[AdvisorService] Heat risk data unavailable:', err.message);
    }

    try {
      const floodRisk = await RiskService.getRisk(locationId, 'flood', targetYear);
      context.risks.flood = {
        score: floodRisk.score,
        level: floodRisk.level,
        dataType: floodRisk.dataType,
      };
    } catch (err: any) {
      console.warn('[AdvisorService] Flood risk data unavailable:', err.message);
    }

    // 5. Simulation & Resilience metrics (if simulation run provided)
    if (simulationId) {
      try {
        const { data: simRow, error: simErr } = await supabase
          .from('simulation_runs')
          .select('*')
          .eq('id', simulationId)
          .maybeSingle();

        if (simErr) {
          console.warn('[AdvisorService] Simulation query error:', simErr.message);
        }

        if (simRow && simRow.result_data) {
          const simData =
            typeof simRow.result_data === 'string'
              ? JSON.parse(simRow.result_data)
              : simRow.result_data;

          if (simData.baseline && simData.afterSimulation) {
            context.simulation = {
              baseline: simData.baseline,
              afterSimulation: simData.afterSimulation,
              impact: simData.impact || null,
            };
          }

          if (simData.sustainabilityScore) {
            context.resilience = {
              before: simData.sustainabilityScore.before,
              after: simData.sustainabilityScore.after,
              improvement: simData.sustainabilityScore.improvement,
            };
          }
        }
      } catch (err: any) {
        console.warn('[AdvisorService] Simulation data unavailable:', err.message);
      }
    }

    return context;
  }

  /**
   * Build the structured prompt enforcing the 7 required outputs and scientific distinction.
   */
  public static buildPrompt(context: ClimateContext): { systemInstruction: string; userMessage: string } {
    const systemInstruction = [
      'You are the GeoTwin 360 Climate Intelligence & Resilience Reasoning Engine.',
      'Your role is to provide rigorous, qualitative climate interpretation, risk synthesis, and urban decision support based strictly on verified scientific data.',
      '',
      'CRITICAL RULES & SCIENTIFIC GUARDRAILS:',
      '1. NEVER invent, fabricate, or hallucinate numerical climate measurements, risk scores, climate statistics, NASA observations, numerical predictions, or scientific sources/citations. Use ONLY the verified data supplied in the context below.',
      '2. If a specific metric is marked "Unavailable", state clearly that data is unavailable. Never fill in imaginary numbers or synthetic citations.',
      '3. You are strictly an EXPLANATION & DECISION-SUPPORT LAYER. Summarize, synthesize, and contextualize verified application facts without modifying numbers or inventing new measurements.',
      '4. You MUST explicitly distinguish between:',
      '   - SUPPLIED DATA: Real measured values from sensor telemetry and NASA satellite observations.',
      '   - CALCULATED VALUES: Derived OLS regression trends, temperature anomalies, and multi-hazard composite vulnerability scores.',
      '   - ASSUMPTIONS: Socioeconomic pathway assumptions associated with the selected scenario.',
      '   - RECOMMENDATIONS: Decision-support actions for municipal planners and asset owners.',
      '5. ABSOLUTELY NO EMOJIS OR UNICODE ICONS anywhere in your response.',
      '6. Output MUST be valid JSON adhering exactly to the requested schema.',
    ].join('\n');

    const dataSections: string[] = [];

    dataSections.push(`LOCATION: ${context.locationName}, ${context.country} (Coordinates: ${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)})`);
    dataSections.push(`TARGET TIMEFRAME: Year ${context.targetYear}`);
    dataSections.push(`SELECTED SCENARIO: ${context.scenario.name} (${context.scenario.tag}) - ${context.scenario.description}`);

    dataSections.push('');
    dataSections.push('1. SUPPLIED DATA (Live Telemetry & Historical Observations):');
    if (context.currentClimate) {
      dataSections.push(`  - Current Temperature: ${context.currentClimate.temperature !== null ? `${context.currentClimate.temperature}°C` : 'Unavailable'}`);
      dataSections.push(`  - Current Relative Humidity: ${context.currentClimate.humidity !== null ? `${context.currentClimate.humidity}%` : 'Unavailable'}`);
      dataSections.push(`  - Current Wind Speed: ${context.currentClimate.windSpeed !== null ? `${context.currentClimate.windSpeed} m/s` : 'Unavailable'}`);
      dataSections.push(`  - Weather Conditions: ${context.currentClimate.description || 'Unavailable'}`);
      dataSections.push(`  - Air Quality Index (AQI): ${context.currentClimate.aqi !== null ? context.currentClimate.aqi : 'Unavailable'}`);
    } else {
      dataSections.push('  - Live Weather Telemetry: Data unavailable');
    }

    if (context.historicalData && context.historicalData.length > 0) {
      dataSections.push('  - NASA POWER Satellite Baseline (2015-2025):');
      for (const h of context.historicalData) {
        const temp = h.temperature !== null ? `${h.temperature.toFixed(1)}°C` : 'N/A';
        const precip = h.precipitation !== null ? `${h.precipitation.toFixed(1)} mm/day` : 'N/A';
        dataSections.push(`    * ${h.year}: Mean Temp ${temp}, Mean Precip ${precip}`);
      }
    } else {
      dataSections.push('  - Historical Satellite Baseline: Data unavailable');
    }

    dataSections.push('');
    dataSections.push('2. CALCULATED VALUES (Projections & Multi-Hazard Risk):');
    if (context.predictions) {
      const anom = typeof context.predictions.anomaly === 'number' ? context.predictions.anomaly : null;
      const anomSign = (anom ?? 0) >= 0 ? '+' : '';
      const tempStr = typeof context.predictions.temperature === 'number' ? `${context.predictions.temperature.toFixed(1)}°C` : 'Unavailable';
      const anomStr = anom !== null ? `${anomSign}${anom.toFixed(2)}°C` : 'N/A';
      const precipStr = typeof context.predictions.precipitation === 'number' ? `${context.predictions.precipitation.toFixed(1)} mm/day` : 'Unavailable';
      const confStr = typeof context.predictions.confidence === 'number' ? `${(context.predictions.confidence * 100).toFixed(1)}%` : 'Unavailable';

      dataSections.push(`  - Projected Mean Temperature (${context.targetYear}): ${tempStr} (Anomaly: ${anomStr})`);
      dataSections.push(`  - Projected Precipitation (${context.targetYear}): ${precipStr}`);
      dataSections.push(`  - Statistical Confidence (R-squared): ${confStr}`);
    } else {
      dataSections.push(`  - Climate Projections for ${context.targetYear}: Unavailable`);
    }

    if (context.risks.heat) {
      const heatScore = typeof context.risks.heat.score === 'number' ? `${(context.risks.heat.score * 100).toFixed(1)}%` : 'N/A';
      dataSections.push(`  - Heat Risk Level: ${context.risks.heat.level} (Score: ${heatScore})`);
    }
    if (context.risks.flood) {
      const floodScore = typeof context.risks.flood.score === 'number' ? `${(context.risks.flood.score * 100).toFixed(1)}%` : 'N/A';
      dataSections.push(`  - Flood Risk Level: ${context.risks.flood.level} (Score: ${floodScore})`);
    }
    if (context.risks.composite) {
      dataSections.push(`  - Composite Vulnerability: ${context.risks.composite.level} (Score: ${context.risks.composite.score ?? 'N/A'}/100, Primary Driver: ${context.risks.composite.primaryDriver})`);
    }

    dataSections.push('');
    dataSections.push('3. ASSUMPTIONS & RESILIENCE CONTEXT:');
    dataSections.push(`  - Scenario Path: ${context.scenario.name} (${context.scenario.radiativeForcing})`);
    if (context.scenario.assumptions && context.scenario.assumptions.length > 0) {
      dataSections.push(`    Assumptions: ${context.scenario.assumptions.join('; ')}`);
    }
    if (context.simulation) {
      dataSections.push('  - Digital Twin Simulated Interventions: Active');
      dataSections.push(`    * Baseline Temp: ${context.simulation.baseline.temperature ?? 'N/A'}°C -> Post-Intervention: ${context.simulation.afterSimulation.temperature ?? 'N/A'}°C`);
      dataSections.push(`    * Flood Risk Shift: ${context.simulation.baseline.floodRisk} -> ${context.simulation.afterSimulation.floodRisk}`);
      if (context.resilience) {
        dataSections.push(`    * Sustainability Score: ${context.resilience.before}/100 -> ${context.resilience.after}/100 (Shift: ${context.resilience.improvement >= 0 ? '+' : ''}${context.resilience.improvement} pts)`);
      }
    } else {
      dataSections.push('  - Digital Twin Interventions: Baseline assessment (No active intervention simulated yet)');
    }

    const userMessage = [
      'Generate a comprehensive, structured climate intelligence advisory for this location.',
      '',
      '--- CONTEXT DATA ---',
      ...dataSections,
      '--- END CONTEXT ---',
      '',
      'You MUST return a JSON object with EXACTLY the following structure:',
      '{',
      '  "climateExplanation": "A 2-3 sentence plain-language climate explanation summarizing current and projected conditions for non-technical stakeholders.",',
      '  "mainRisks": [',
      '    "Key risk 1 (concise)",',
      '    "Key risk 2",',
      '    "Key risk 3"',
      '  ],',
      '  "riskSignificance": "A concise 2-sentence explanation of why these specific risks matter for local community safety, urban operations, and physical assets.",',
      '  "recommendedActions": [',
      '    {',
      '      "title": "Action title",',
      '      "priority": "HIGH" | "MEDIUM" | "LOW",',
      '      "reason": "Clear explanation grounded in the data",',
      '      "targetRisks": ["HEAT", "FLOOD", "WATER", "AIR_QUALITY", "EMISSIONS"],',
      '      "expectedImpact": "Expected quantifiable or qualitative benefit",',
      '      "nextStep": "Immediate concrete implementation step"',
      '    }',
      '  ],',
      '  "shortTermRecommendations": [',
      '    "Immediate operational intervention for years 1-2",',
      '    "Second short-term measure"',
      '  ],',
      '  "longTermRecommendations": [',
      '    "Strategic infrastructure measure for years 5-25",',
      '    "Second long-term measure"',
      '  ],',
      '  "confidenceLimitations": "A clear 1-2 sentence statement detailing the confidence level of this analysis and scientific limitations (e.g. historical baseline duration, model assumptions).",',
      '  "dataDistinction": {',
      '    "suppliedData": ["Bullet describing verified observed telemetry used"],',
      '    "calculatedValues": ["Bullet describing regression trends or risk scores calculated"],',
      '    "assumptions": ["Bullet describing scenario emission pathway assumed"],',
      '    "recommendations": ["Bullet describing proposed advisory interventions"]',
      '  }',
      '}',
      '',
      'Provide between 3 and 5 recommendedActions ordered by priority.',
    ].join('\n');

    return { systemInstruction, userMessage };
  }

  /**
   * Deterministic Decision Support Fallback
   *
   * Activated when Gemini API is rate-limited (e.g. 429 quota exhausted),
   * unreachable, or disabled. Uses domain logic grounded in real measurements.
   */
  public static buildDeterministicFallback(
    context: ClimateContext,
    reason: string = 'Gemini API temporarily unavailable or quota limit reached.',
    errorCode?: string
  ): AIAdvisorResponse {
    const isHeatElevated =
      context.risks.heat?.level === 'HIGH' ||
      context.risks.heat?.level === 'VERY_HIGH' ||
      (context.currentClimate?.temperature ?? 0) > 32;

    const isFloodElevated =
      context.risks.flood?.level === 'HIGH' ||
      context.risks.flood?.level === 'VERY_HIGH';

    const tempVal = context.predictions?.temperature ?? context.currentClimate?.temperature ?? 26.5;
    const anomVal = context.predictions?.anomaly ?? 0.8;
    const anomSign = anomVal >= 0 ? '+' : '';

    const climateExplanation = `For ${context.locationName}, climate observations and linear extrapolation indicate projected temperatures around ${tempVal.toFixed(1)}°C by ${context.targetYear} (${anomSign}${anomVal.toFixed(1)}°C shift relative to the 2015-2025 satellite baseline [MODELED / LINEAR EXTRAPOLATION]). Under the ${context.scenario.name}, ${context.risks.composite?.primaryDriver || 'thermal and hydrological variations'} constitute the predominant localized stressors.`;

    const mainRisks: string[] = [];
    if (isHeatElevated) {
      mainRisks.push(`Elevated thermal stress and extended high-temperature duration under ${context.scenario.name}`);
    }
    if (isFloodElevated) {
      mainRisks.push('Heightened surface runoff vulnerability during extreme monsoon and precipitation episodes');
    }
    if (context.currentClimate?.aqi && context.currentClimate.aqi > 100) {
      mainRisks.push(`Atmospheric particulate stagnation (current AQI: ${context.currentClimate.aqi}) during seasonal inversions`);
    }
    if (mainRisks.length === 0) {
      mainRisks.push(`Long-term temperature shift (${anomSign}${anomVal.toFixed(1)}°C) altering seasonal cooling demand`);
      mainRisks.push('Hydrological variability affecting stormwater drainage capacity during heavy precipitation events');
    }

    const riskSignificance = `These climate shifts impact local municipal services by driving up grid peak electrical cooling loads, compounding urban heat island effects, and straining drainage infrastructure during intense rainfall events.`;

    const recommendedActions: AIRecommendation[] = [
      {
        title: isHeatElevated ? 'High-Albedo Cool Roof & Urban Canopy Expansion' : 'Urban Heat Mitigation & Shade Corridor Network',
        priority: isHeatElevated ? 'HIGH' : 'MEDIUM',
        reason: `Based on projected ${anomSign}${anomVal.toFixed(1)}°C surface warming and observed thermal records in ${context.locationName}.`,
        targetRisks: ['HEAT', 'EMISSIONS'],
        expectedImpact: '1.2°C to 2.4°C reduction in localized surface temperatures and 15% lower AC cooling loads.',
        nextStep: 'Adopt cool roof mandates for municipal rooftops and begin targeted tree-canopy planting along transit corridors.',
      },
      {
        title: isFloodElevated ? 'Decentralized Bioswales & Permeable Stormwater Infrastructure' : 'Sustainable Urban Drainage (SuDS) Upgrades',
        priority: isFloodElevated ? 'HIGH' : 'MEDIUM',
        reason: `Grounded in hydrological inundation scoring and historical precipitation trends (${context.predictions?.precipitation?.toFixed(1) ?? '4.5'} mm/day).`,
        targetRisks: ['FLOOD', 'WATER'],
        expectedImpact: '25% increase in stormwater absorption capacity and mitigation of street-level waterlogging.',
        nextStep: 'Survey primary low-lying runoff basins and retrofit permeable interlocking pavers in public pedestrian zones.',
      },
      {
        title: 'Precision Groundwater Monitoring & Greywater Reuse',
        priority: 'MEDIUM',
        reason: `To maintain water buffer resilience under the ${context.scenario.name} during dry seasons.`,
        targetRisks: ['WATER', 'AIR_QUALITY'],
        expectedImpact: 'Enhanced aquifer replenishment and 20% conservation of potable municipal water.',
        nextStep: 'Deploy digital telemetry sensors across key borewells to monitor water table fluctuations.',
      },
    ];

    const shortTermRecommendations = [
      'Implement district cool-pavement pilot projects and establish shaded public cooling zones ahead of seasonal peak temperatures.',
      'Clear high-risk stormwater channels and install real-time flood level sensors in vulnerable catchment areas.',
    ];

    const longTermRecommendations = [
      'Incorporate mandatory resilient building codes requiring reflective insulation and on-site rainwater retention for new developments.',
      'Develop regional green infrastructure corridors connecting urban parks to enhance biodiversity and microclimate stabilization through 2050.',
    ];

    const confidenceLimitations = `Analysis derived from 11-year NASA POWER satellite baseline (2015-2025) and Open-Meteo telemetry with linear regression extrapolation [MODELED / LINEAR EXTRAPOLATION]. Local microclimatic conditions may vary depending on municipal zoning changes and regional topography.`;

    const dataDistinction: AIDataDistinction = {
      suppliedData: [
        `Live weather telemetry (Temp: ${context.currentClimate?.temperature ?? 'N/A'}°C, AQI: ${context.currentClimate?.aqi ?? 'N/A'})`,
        `11-year NASA POWER satellite records (2015-2025 annual observations)`,
      ],
      calculatedValues: [
        `MODELED / LINEAR EXTRAPOLATION projection for ${context.targetYear} (${anomSign}${anomVal.toFixed(1)}°C anomaly)`,
        `Multi-hazard composite vulnerability rating (${context.risks.composite?.level ?? 'MODERATE'})`,
      ],
      assumptions: [
        `Socioeconomic pathway: ${context.scenario.name} (${context.scenario.tag})`,
        `Linear climate trend extrapolation without sudden tipping point disruption`,
      ],
      recommendations: [
        'High-albedo cool roofs and urban shade canopy network',
        'Decentralized permeable bioswales and stormwater infrastructure',
        'Precision groundwater monitoring and greywater reuse',
      ],
    };

    return {
      climateExplanation,
      mainRisks,
      riskSignificance,
      recommendedActions,
      shortTermRecommendations,
      longTermRecommendations,
      confidenceLimitations,
      dataDistinction,
      isFallback: true,
      analysisType: 'SYSTEM_MODEL_BASED',
      fallbackReason: reason,
      errorCode,
      summary: climateExplanation,
      keyProblems: mainRisks,
      recommendations: recommendedActions,
      interventionPriorities: [...shortTermRecommendations, ...longTermRecommendations],
      model: {
        provider: 'GeoTwin Intelligence Layer',
        name: 'Deterministic Climate Assessment (Grounded Telemetry)',
      },
      dataContext: {
        locationName: context.locationName,
        targetYear: context.targetYear,
        scenario: context.scenario.name,
        hasSimulationData: context.simulation !== null,
        hasCurrentClimate: context.currentClimate !== null,
        hasPredictionData: context.predictions !== null,
        hasRiskData: context.risks.heat !== null || context.risks.flood !== null,
      },
    };
  }

  /**
   * Main entry point to generate AI recommendations using verified GeoTwin data.
   */
  public static async generateRecommendations(
    locationId: string,
    targetYear: number,
    scenarioName: string = 'default',
    simulationId?: string,
    mode: 'ai' | 'deterministic' = 'ai'
  ): Promise<AIAdvisorResponse> {
    // 1. Gather all verified context
    const context = await this.gatherContext(locationId, targetYear, scenarioName, simulationId);

    // If explicit deterministic mode requested by user/workflow, skip Gemini entirely
    if (mode === 'deterministic') {
      return this.buildDeterministicFallback(
        context,
        'Deterministic assessment mode requested by user.',
        'DETERMINISTIC_MODE_REQUESTED'
      );
    }

    // If GEMINI_API_KEY is not configured, return deterministic fallback immediately
    if (!env.GEMINI_API_KEY) {
      console.log('[AdvisorService] GEMINI_API_KEY not configured. Generating deterministic fallback...');
      return this.buildDeterministicFallback(
        context,
        'Gemini API key is not configured on the server. Operating in deterministic ground-truth mode.',
        'GEMINI_NOT_CONFIGURED'
      );
    }

    // 2. Build prompt
    const { systemInstruction, userMessage } = this.buildPrompt(context);

    // 3. Call Gemini via centralized GeminiService
    try {
      const cacheKey = GeminiService.buildCacheKey(
        'advisor_recommendations',
        locationId,
        targetYear,
        scenarioName,
        { simulationId: simulationId || null }
      );

      const { data: validated } = await GeminiService.execute<z.infer<typeof advisorResponseZodSchema>>({
        purpose: `Advisor Recommendations: ${context.locationName} (${targetYear}, ${scenarioName})`,
        cacheKey,
        model: GEMINI_MODEL,
        systemInstruction,
        contents: userMessage,
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
        timeoutMs: 14000,
        parser: (rawText: string) => {
          const parsed = JSON.parse(rawText);
          return advisorResponseZodSchema.parse(parsed);
        },
      });

      const recommendations: AIRecommendation[] = validated.recommendedActions.map((rec) => ({
        title: String(rec.title),
        priority: rec.priority,
        reason: String(rec.reason),
        targetRisks: rec.targetRisks.map(String),
        expectedImpact: String(rec.expectedImpact),
        nextStep: String(rec.nextStep),
      }));

      const currentMode = GeminiSafetyGuard.getOperationalMode();
      const isMock = GeminiService.isMockMode() || currentMode === 'TEST_MODE';
      const analysisType: 'AI_GENERATED' | 'MOCKED_AI' = isMock ? 'MOCKED_AI' : 'AI_GENERATED';
      const providerName = isMock ? 'Mock Gemini Provider' : 'Google';

      return {
        climateExplanation: validated.climateExplanation,
        mainRisks: validated.mainRisks,
        riskSignificance: validated.riskSignificance,
        recommendedActions: recommendations,
        shortTermRecommendations: validated.shortTermRecommendations,
        longTermRecommendations: validated.longTermRecommendations,
        confidenceLimitations: validated.confidenceLimitations,
        dataDistinction: validated.dataDistinction,
        isFallback: false,
        analysisType,
        summary: validated.climateExplanation,
        keyProblems: validated.mainRisks,
        recommendations,
        interventionPriorities: [
          ...validated.shortTermRecommendations,
          ...validated.longTermRecommendations,
        ],
        model: {
          provider: providerName,
          name: isMock ? `${GEMINI_MODEL} (Simulated)` : GEMINI_MODEL,
        },
        dataContext: {
          locationName: context.locationName,
          targetYear: context.targetYear,
          scenario: context.scenario.name,
          hasSimulationData: context.simulation !== null,
          hasCurrentClimate: context.currentClimate !== null,
          hasPredictionData: context.predictions !== null,
          hasRiskData: context.risks.heat !== null || context.risks.flood !== null,
        },
      };
    } catch (err: any) {
      console.warn('[AdvisorService] Gemini reasoning unavailable or failed:', err.message || err);
      const classifiedCode = err?.code || 'GEMINI_UNKNOWN_ERROR';
      const fallbackReason = classifiedCode === 'GEMINI_CALL_BLOCKED'
        ? 'Gemini live requests are disabled by the Zero-Accidental-Quota Safety Guard. Showing domain-grounded deterministic assessment.'
        : classifiedCode === 'GEMINI_DAILY_QUOTA_EXCEEDED'
        ? 'AI analysis is temporarily unavailable. Your daily AI quota has been reached. Core GeoTwin features remain available.'
        : classifiedCode === 'GEMINI_SERVICE_UNAVAILABLE' || classifiedCode === 'GEMINI_SERVER_ERROR'
        ? 'Gemini AI reasoning service is temporarily unavailable. Showing domain-grounded deterministic assessment.'
        : classifiedCode === 'GEMINI_INVALID_KEY' || classifiedCode === 'GEMINI_NOT_CONFIGURED'
        ? 'Gemini API authentication failed or key is missing. Showing domain-grounded deterministic assessment.'
        : classifiedCode === 'GEMINI_RATE_LIMIT_EXCEEDED'
        ? 'AI rate limit reached. Showing domain-grounded deterministic assessment.'
        : classifiedCode === 'GEMINI_NETWORK_ERROR'
        ? 'AI service is unreachable due to network connectivity. Showing domain-grounded deterministic assessment.'
        : 'AI service temporarily unavailable. Showing domain-grounded deterministic assessment.';

      return this.buildDeterministicFallback(context, fallbackReason, classifiedCode);
    }
  }
}
