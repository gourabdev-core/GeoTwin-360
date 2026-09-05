import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { ClimateService } from './climateService.js';
import { PredictionService } from './predictionService.js';
import { RiskService } from './riskService.js';
import { LocationService } from './locationService.js';
import { supabase } from '../config/supabase.js';
import type { SimulationResult } from './simulationService.js';

/**
 * AI Advisor Service
 *
 * Collects verified GeoTwin climate data and sends structured context
 * to Gemini for recommendation generation. Gemini is used purely as a
 * reasoning/recommendation layer -- it never invents climate measurements.
 *
 * Data flow:
 *   Climate Provider -> GeoTwin Services -> Structured Context -> Gemini -> Recommendations
 */

export interface AIRecommendation {
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  targetRisks: string[];
  expectedImpact: string;
  nextStep: string;
}

export interface AIAdvisorResponse {
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
    hasSimulationData: boolean;
    hasCurrentClimate: boolean;
    hasPredictionData: boolean;
    hasRiskData: boolean;
  };
}

interface ClimateContext {
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  targetYear: number;
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
  } | null;
  risks: {
    heat: { score: number | null; level: string; dataType: string } | null;
    flood: { score: number | null; level: string; dataType: string } | null;
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

const GEMINI_MODEL = 'gemini-3.6-flash';

export class AdvisorService {
  private static getClient(): GoogleGenAI {
    if (!env.GEMINI_API_KEY) {
      const err: any = new Error('Gemini API key is not configured.');
      err.statusCode = 503;
      err.code = 'AI_UNAVAILABLE';
      throw err;
    }
    return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  /**
   * Gather all verified climate context for a location from existing GeoTwin services.
   */
  private static async gatherContext(
    locationId: string,
    targetYear: number,
    simulationId?: string
  ): Promise<ClimateContext> {
    // 1. Resolve location
    const location = await LocationService.getLocationById(locationId);

    const context: ClimateContext = {
      locationName: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      targetYear,
      currentClimate: null,
      historicalData: null,
      predictions: null,
      risks: { heat: null, flood: null },
      resilience: null,
      simulation: null,
    };

    // 2. Current climate data
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

    // 3. Historical data (NASA POWER via ClimateService)
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

    // 4. Future predictions for target year
    try {
      const projection = await PredictionService.getProjectionForYear(locationId, targetYear);
      if (projection) {
        context.predictions = {
          temperature: projection.temperature ?? null,
          precipitation: projection.precipitation ?? null,
          confidence: projection.confidence ?? null,
        };
      }
    } catch (err: any) {
      console.warn('[AdvisorService] Prediction data unavailable:', err.message);
    }

    // 5. Risk assessments
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

    // 6. Simulation results (if simulationId is provided)
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
          const simData = typeof simRow.result_data === 'string'
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
   * Build the Gemini system prompt and user message from gathered context.
   */
  private static buildPrompt(context: ClimateContext): { systemInstruction: string; userMessage: string } {
    const systemInstruction = [
      'You are a professional climate risk advisor for GeoTwin 360, a climate intelligence platform.',
      'You analyze real, verified climate data and provide actionable recommendations.',
      '',
      'STRICT RULES:',
      '- ONLY use the data provided in the context below. NEVER invent, fabricate, or hallucinate climate measurements, risk scores, or statistics.',
      '- If a data point is null or unavailable, explicitly state that the data is unavailable. Do not guess.',
      '- All recommendations must be grounded in the provided data.',
      '- Be specific to the location and its geographic/climatic characteristics.',
      '- Prioritize practical, actionable interventions.',
      '- Keep descriptions, summaries, and reasons highly concise (at most 2 sentences each) to prevent response truncation.',
      '- Use professional language without emoji or decorative characters.',
      '- Return ONLY valid JSON matching the specified schema.',
    ].join('\n');

    const dataSections: string[] = [];

    dataSections.push(`LOCATION: ${context.locationName}, ${context.country} (${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)})`);
    dataSections.push(`TARGET YEAR: ${context.targetYear}`);

    if (context.currentClimate) {
      dataSections.push('');
      dataSections.push('CURRENT CLIMATE (Observed):');
      dataSections.push(`  Temperature: ${context.currentClimate.temperature !== null ? context.currentClimate.temperature + ' C' : 'Unavailable'}`);
      dataSections.push(`  Humidity: ${context.currentClimate.humidity !== null ? context.currentClimate.humidity + '%' : 'Unavailable'}`);
      dataSections.push(`  Wind Speed: ${context.currentClimate.windSpeed !== null ? context.currentClimate.windSpeed + ' m/s' : 'Unavailable'}`);
      dataSections.push(`  Conditions: ${context.currentClimate.description || 'Unavailable'}`);
      dataSections.push(`  Air Quality Index: ${context.currentClimate.aqi !== null ? context.currentClimate.aqi : 'Unavailable'}`);
    } else {
      dataSections.push('');
      dataSections.push('CURRENT CLIMATE: Data unavailable');
    }

    if (context.historicalData && context.historicalData.length > 0) {
      dataSections.push('');
      dataSections.push('HISTORICAL ANNUAL CLIMATE DATA (NASA POWER, 2015-2024):');
      for (const h of context.historicalData) {
        const temp = h.temperature !== null ? `${h.temperature.toFixed(1)} C` : 'N/A';
        const precip = h.precipitation !== null ? `${h.precipitation.toFixed(1)} mm` : 'N/A';
        dataSections.push(`  ${h.year}: Temp ${temp}, Precipitation ${precip}`);
      }
    } else {
      dataSections.push('');
      dataSections.push('HISTORICAL DATA: Unavailable');
    }

    if (context.predictions) {
      dataSections.push('');
      dataSections.push(`PROJECTED CLIMATE FOR ${context.targetYear} (GeoTwin Prediction Engine, OLS Linear Regression):`);
      dataSections.push(`  Projected Temperature: ${context.predictions.temperature !== null ? context.predictions.temperature.toFixed(1) + ' C' : 'Unavailable'}`);
      dataSections.push(`  Projected Precipitation: ${context.predictions.precipitation !== null ? context.predictions.precipitation.toFixed(1) + ' mm' : 'Unavailable'}`);
      dataSections.push(`  Model Confidence (R-squared): ${context.predictions.confidence !== null ? (context.predictions.confidence * 100).toFixed(1) + '%' : 'Unavailable'}`);
    } else {
      dataSections.push('');
      dataSections.push(`PROJECTED CLIMATE FOR ${context.targetYear}: Unavailable`);
    }

    dataSections.push('');
    dataSections.push('RISK ASSESSMENT:');
    if (context.risks.heat) {
      dataSections.push(`  Heat Risk: Score ${context.risks.heat.score !== null ? (context.risks.heat.score * 100).toFixed(1) + '%' : 'N/A'}, Level ${context.risks.heat.level}, Data Type: ${context.risks.heat.dataType}`);
    } else {
      dataSections.push('  Heat Risk: Data unavailable');
    }
    if (context.risks.flood) {
      dataSections.push(`  Flood Risk: Score ${context.risks.flood.score !== null ? (context.risks.flood.score * 100).toFixed(1) + '%' : 'N/A'}, Level ${context.risks.flood.level}, Data Type: ${context.risks.flood.dataType}`);
    } else {
      dataSections.push('  Flood Risk: Data unavailable');
    }

    if (context.simulation) {
      dataSections.push('');
      dataSections.push('SIMULATION RESULTS (Intervention Scenario):');
      dataSections.push(`  Baseline Temperature: ${context.simulation.baseline.temperature !== null ? context.simulation.baseline.temperature + ' C' : 'N/A'}`);
      dataSections.push(`  Post-Intervention Temperature: ${context.simulation.afterSimulation.temperature !== null ? context.simulation.afterSimulation.temperature + ' C' : 'N/A'}`);
      dataSections.push(`  Baseline Flood Risk: ${context.simulation.baseline.floodRisk}`);
      dataSections.push(`  Post-Intervention Flood Risk: ${context.simulation.afterSimulation.floodRisk}`);

      if (context.simulation.impact) {
        dataSections.push(`  Temperature Impact: ${context.simulation.impact.temperature !== null ? context.simulation.impact.temperature + ' C' : 'N/A'}`);
        dataSections.push(`  Water Availability Impact: ${context.simulation.impact.waterAvailability !== null ? context.simulation.impact.waterAvailability + '%' : 'N/A'}`);
        dataSections.push(`  AQI Impact: ${context.simulation.impact.airQualityIndex !== null ? context.simulation.impact.airQualityIndex : 'N/A'}`);
        dataSections.push(`  Green Cover Impact: ${context.simulation.impact.greenCover !== null ? context.simulation.impact.greenCover + '%' : 'N/A'}`);
        dataSections.push(`  CO2 Emissions Impact: ${context.simulation.impact.co2Emissions !== null ? context.simulation.impact.co2Emissions + '%' : 'N/A'}`);
      }
    }

    if (context.resilience) {
      dataSections.push('');
      dataSections.push('RESILIENCE SCORE:');
      dataSections.push(`  Before Intervention: ${context.resilience.before}/100`);
      dataSections.push(`  After Intervention: ${context.resilience.after}/100`);
      dataSections.push(`  Improvement: ${context.resilience.improvement >= 0 ? '+' : ''}${context.resilience.improvement}`);
    }

    const userMessage = [
      'Based on the verified climate data below, provide a structured climate risk analysis and actionable recommendations.',
      '',
      '---',
      ...dataSections,
      '---',
      '',
      'Respond with a JSON object matching this exact schema:',
      '{',
      '  "summary": "A 2-3 sentence summary of the overall climate risk situation for this location.",',
      '  "keyProblems": ["Problem 1", "Problem 2", ...],',
      '  "recommendations": [',
      '    {',
      '      "title": "Short title",',
      '      "priority": "HIGH" | "MEDIUM" | "LOW",',
      '      "reason": "Why this is important based on the data",',
      '      "targetRisks": ["HEAT", "FLOOD", "AIR_QUALITY", "WATER", "EMISSIONS"],',
      '      "expectedImpact": "Expected outcome",',
      '      "nextStep": "Specific actionable next step"',
      '    }',
      '  ],',
      '  "interventionPriorities": ["Priority 1", "Priority 2", ...]',
      '}',
      '',
      'Provide 3-5 recommendations ordered by priority. Be specific to the location.',
    ].join('\n');

    return { systemInstruction, userMessage };
  }

  /**
   * Generate AI recommendations for a location using verified GeoTwin data.
   */
  static async generateRecommendations(
    locationId: string,
    targetYear: number,
    simulationId?: string
  ): Promise<AIAdvisorResponse> {
    // 1. Gather all verified context
    const context = await this.gatherContext(locationId, targetYear, simulationId);

    // 2. Build prompt
    const { systemInstruction, userMessage } = this.buildPrompt(context);

    // 3. Call Gemini
    const ai = this.getClient();

    let responseText = '';
    const maxAttempts = 3;
    let attempt = 0;
    let parsed: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        console.log(`[AdvisorService] Call attempt ${attempt}/${maxAttempts}...`);
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: userMessage,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        });

        responseText = response.text ?? '';
        if (!responseText.trim()) {
          throw new Error('Gemini returned an empty response.');
        }

        // Try to parse the JSON
        parsed = JSON.parse(responseText);

        // Validate required fields
        if (!parsed.summary || !Array.isArray(parsed.recommendations)) {
          throw new Error('AI response is missing required fields.');
        }

        // If everything succeeded, break the retry loop
        break;
      } catch (err: any) {
        console.warn(`[AdvisorService] Attempt ${attempt} failed:`, err.message || err);

        const isRetryable =
          err instanceof SyntaxError ||
          err.message?.includes('JSON') ||
          err.message?.includes('missing required fields') ||
          err.status === 503 ||
          err.status === 429 ||
          err.statusCode === 503 ||
          err.statusCode === 429 ||
          err.message?.toLowerCase().includes('overloaded') ||
          err.message?.toLowerCase().includes('high demand') ||
          err.message?.toLowerCase().includes('unavailable') ||
          err.message?.toLowerCase().includes('rate limit');

        if (!isRetryable || attempt >= maxAttempts) {
          const statusCode = err.status || err.statusCode || 500;
          const errorCode = err.code || (statusCode === 503 ? 'AI_UNAVAILABLE' : 'AI_GENERATION_FAILED');
          
          const finalErr: any = new Error(err.message || 'AI recommendation service is temporarily unavailable.');
          finalErr.statusCode = statusCode;
          finalErr.code = errorCode;
          finalErr.details = err.details || {};
          throw finalErr;
        }

        const backoffMs = attempt === 1 ? 1500 : 3000;
        console.log(`[AdvisorService] Retryable error encountered. Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // 5. Build validated response
    const recommendations: AIRecommendation[] = (parsed.recommendations || []).map((rec: any) => ({
      title: String(rec.title || 'Untitled Recommendation'),
      priority: ['HIGH', 'MEDIUM', 'LOW'].includes(rec.priority) ? rec.priority : 'MEDIUM',
      reason: String(rec.reason || ''),
      targetRisks: Array.isArray(rec.targetRisks) ? rec.targetRisks.map(String) : [],
      expectedImpact: String(rec.expectedImpact || ''),
      nextStep: String(rec.nextStep || ''),
    }));

    return {
      summary: String(parsed.summary),
      keyProblems: Array.isArray(parsed.keyProblems) ? parsed.keyProblems.map(String) : [],
      recommendations,
      interventionPriorities: Array.isArray(parsed.interventionPriorities) ? parsed.interventionPriorities.map(String) : [],
      model: {
        provider: 'Google',
        name: GEMINI_MODEL,
      },
      dataContext: {
        locationName: context.locationName,
        targetYear: context.targetYear,
        hasSimulationData: context.simulation !== null,
        hasCurrentClimate: context.currentClimate !== null,
        hasPredictionData: context.predictions !== null,
        hasRiskData: context.risks.heat !== null || context.risks.flood !== null,
      },
    };
  }
}
