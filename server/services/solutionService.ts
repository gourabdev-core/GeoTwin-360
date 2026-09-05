import { GeminiService } from './geminiService.js';
import { env } from '../config/env.js';
import { LocationService } from './locationService.js';
import { ClimateService } from './climateService.js';
import { PredictionService, SCENARIO_DEFINITIONS } from './predictionService.js';
import {
  ResilienceSolution,
  ResilienceSolutionsResponse,
  ResilienceRisksSummary,
  ResilienceAiExplanation,
  SolutionPriority,
  ImplementationDifficulty,
  SolutionStatus,
  ResilienceSolutionCategory,
} from '../types/solution.js';
import { ScenarioType } from '../types/prediction.js';

export class SolutionService {
  /**
   * Resolve location metadata safely (handles standard UUID or coordinate string ID).
   */
  private static async resolveLocation(locationId: string) {
    try {
      const loc = await LocationService.getLocationById(locationId);
      if (loc) {
        return {
          id: locationId,
          name: loc.name || 'Selected Location',
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
        };
      }
    } catch {
      // Coordinate fallback: loc-22.5726-88.3638
      const match = locationId.match(/loc-([0-9.-]+)-([0-9.-]+)/);
      if (match) {
        return {
          id: locationId,
          name: 'Selected Location',
          latitude: parseFloat(match[1]),
          longitude: parseFloat(match[2]),
        };
      }
    }

    return {
      id: locationId,
      name: 'Selected Location',
      latitude: 0,
      longitude: 0,
    };
  }

  /**
   * Generate complete data-grounded resilience solutions for a given location,
   * year, scenario, and identified climate risks.
   */
  public static async getSolutions(
    locationId: string,
    targetYear: number = 2035,
    scenarioName: string = 'default',
    includeAi: boolean = false
  ): Promise<ResilienceSolutionsResponse> {
    const locMeta = await this.resolveLocation(locationId);
    const validYear = [2030, 2035, 2040, 2050].includes(targetYear) ? targetYear : 2035;
    const scenarioKey: ScenarioType = ['default', 'resilience', 'accelerated'].includes(scenarioName)
      ? (scenarioName as ScenarioType)
      : 'default';
    const activeScenario = SCENARIO_DEFINITIONS[scenarioKey] || SCENARIO_DEFINITIONS.default;

    // 1. Fetch real and derived climate analysis for target year and scenario (without redundant AI generation)
    const climateAnalysis = await PredictionService.getClimateAnalysis(
      locationId,
      validYear,
      scenarioKey,
      false
    );

    const {
      temperatureTrend,
      precipitationTrend,
      heatRisk,
      floodRisk,
      droughtRisk,
      overallRisk,
    } = climateAnalysis.indicators;

    const realAqi = climateAnalysis.observedBaseline?.aqi ?? 58;
    const aqiLevel = realAqi > 150 ? 'VERY_HIGH' : realAqi > 100 ? 'HIGH' : realAqi > 50 ? 'MODERATE' : 'LOW';

    // 2. Synthesize Risk Summary
    const risksSummary: ResilienceRisksSummary = {
      heat: {
        level: heatRisk.level,
        score: heatRisk.score,
        extremeDays: heatRisk.extremeHeatDaysProjected,
      },
      flood: {
        level: floodRisk.level,
        score: floodRisk.score,
        projectedPrecip: precipitationTrend.value,
      },
      drought: {
        level: droughtRisk.level,
        score: droughtRisk.score,
        soilMoisture: droughtRisk.soilMoistureIndex ?? climateAnalysis.observedBaseline?.soilMoisture ?? 0.32,
      },
      airQuality: {
        aqi: realAqi,
        level: aqiLevel,
      },
      composite: {
        level: overallRisk.level,
        score: overallRisk.score,
        primaryDriver: overallRisk.primaryDriver,
      },
    };

    // 3. Generate Deterministic Recommendations for All 7 Required Categories
    const solutions = this.buildDeterministicSolutions(
      locMeta,
      validYear,
      scenarioKey,
      activeScenario.name,
      temperatureTrend,
      precipitationTrend,
      risksSummary
    );

    // 4. Optional Gemini AI Personalization Layer
    let aiExplanation: ResilienceAiExplanation | undefined;
    if (includeAi) {
      aiExplanation = await this.generateAiExplanation(
        locMeta,
        validYear,
        scenarioKey,
        risksSummary,
        solutions
      );
    }

    return {
      location: locMeta,
      targetYear: validYear,
      scenario: {
        id: activeScenario.id,
        name: activeScenario.name,
        tag: activeScenario.tag,
        description: activeScenario.description,
      },
      risks: risksSummary,
      solutions,
      aiExplanation,
    };
  }

  /**
   * Deterministic generation engine for 7 core categories.
   * Grounded in real temperature, precipitation, and multi-hazard indicators.
   */
  private static buildDeterministicSolutions(
    locMeta: { id: string; name: string; latitude: number; longitude: number },
    year: number,
    scenario: ScenarioType,
    scenarioName: string,
    tempTrend: { value: number; baselineValue: number; anomaly: number },
    precipTrend: { value: number; baselineValue: number; changePercent: number },
    risks: ResilienceRisksSummary
  ): ResilienceSolution[] {
    const isHeatSevere = risks.heat.level === 'VERY_HIGH' || risks.heat.level === 'HIGH' || tempTrend.value >= 30;
    const isFloodSevere = risks.flood.level === 'VERY_HIGH' || risks.flood.level === 'HIGH' || precipTrend.value >= 4.0;
    const isDroughtSevere = risks.drought.level === 'VERY_HIGH' || risks.drought.level === 'HIGH' || (risks.drought.soilMoisture ?? 0.3) < 0.25;
    const isAirQualityPoor = risks.airQuality.aqi > 100 || risks.airQuality.level === 'HIGH' || risks.airQuality.level === 'VERY_HIGH';

    const tempSign = tempTrend.anomaly >= 0 ? '+' : '';
    const precipSign = precipTrend.changePercent >= 0 ? '+' : '';

    // Define time horizon based on target year
    const horizon: ResilienceSolution['timeHorizon'] =
      year <= 2030
        ? 'Immediate (0-2 years)'
        : year <= 2035
        ? 'Medium-term (2-5 years)'
        : 'Strategic (5-15 years)';

    // Adjust deployment progress and status based on scenario
    const getScenarioStatusAndProgress = (
      baseStatus: SolutionStatus,
      baseProgress: number
    ): { status: SolutionStatus; progress: number } => {
      if (scenario === 'resilience') {
        return {
          status: 'Active',
          progress: Math.min(100, baseProgress + 35),
        };
      }
      if (scenario === 'accelerated') {
        return {
          status: 'Proposed',
          progress: Math.max(10, Math.round(baseProgress * 0.6)),
        };
      }
      return { status: baseStatus, progress: baseProgress };
    };

    const solutions: ResilienceSolution[] = [];

    // -------------------------------------------------------------
    // Category 1: Water management
    // -------------------------------------------------------------
    const waterPriority: SolutionPriority =
      scenario === 'accelerated' && isDroughtSevere
        ? 'Critical'
        : isDroughtSevere || (isFloodSevere && precipTrend.value > 5.0)
        ? 'High'
        : 'Medium';
    const waterDifficulty: ImplementationDifficulty = year >= 2040 ? 'High' : 'Moderate';
    const waterStage = getScenarioStatusAndProgress(
      isDroughtSevere ? 'Active' : 'Planned',
      isDroughtSevere ? 55 : 40
    );

    solutions.push({
      id: 'sol-water-mgmt',
      title: 'Decentralized Aquifer Recharge & Rainwater Harvesting Networks',
      category: 'Water management',
      problemAddressed: `Observed regional hydrological variance with a projected precipitation trend of ${precipTrend.value.toFixed(1)} mm/day (${precipSign}${precipTrend.changePercent.toFixed(1)}% shift) and soil moisture level around ${((risks.drought.soilMoisture ?? 0.3) * 100).toFixed(0)}% in ${locMeta.name} by ${year}.`,
      recommendedAction: 'Mandate decentralized rainwater retention wells for commercial facilities, deploy permeable gravel percolation pits, and install smart real-time water table sensors.',
      expectedBenefit: 'Increases municipal groundwater buffer by 20% to 35% and stabilizes seasonal dry-period water availability.',
      priority: waterPriority,
      implementationDifficulty: waterDifficulty,
      relevantRisk: isDroughtSevere ? 'Severe Drought & Aquifer Depletion' : 'Hydrological Volatility & Surface Runoff',
      status: waterStage.status,
      progress: waterStage.progress,
      timeHorizon: horizon,
      iconName: 'Droplets',
    });

    // -------------------------------------------------------------
    // Category 2: Flood protection
    // -------------------------------------------------------------
    const floodPriority: SolutionPriority =
      scenario === 'accelerated' && isFloodSevere
        ? 'Critical'
        : isFloodSevere
        ? 'High'
        : 'Medium';
    const floodDifficulty: ImplementationDifficulty = year >= 2040 ? 'Complex' : 'High';
    const floodStage = getScenarioStatusAndProgress(
      isFloodSevere ? 'Active' : 'Planned',
      isFloodSevere ? 60 : 35
    );

    solutions.push({
      id: 'sol-flood-prot',
      title: 'Vegetated Bioswale Corridors & Sustainable Urban Drainage (SuDS)',
      category: 'Flood protection',
      problemAddressed: `Surface runoff inundation during extreme storm events, with flood risk rated at ${risks.flood.level} (score: ${risks.flood.score !== null ? (risks.flood.score * 100).toFixed(0) + '%' : 'N/A'}) under the ${scenarioName} in ${locMeta.name}.`,
      recommendedAction: 'Construct roadside bioswales along arterial roads, replace impermeable concrete in public plazas with porous asphalt, and expand detention retention basins in low-elevation catchments.',
      expectedBenefit: 'Attenuates peak stormwater runoff volume by 25% to 40% and prevents localized street waterlogging during monsoon downpours.',
      priority: floodPriority,
      implementationDifficulty: floodDifficulty,
      relevantRisk: 'Urban Flash Flooding & Stormwater Overload',
      status: floodStage.status,
      progress: floodStage.progress,
      timeHorizon: horizon,
      iconName: 'ShieldAlert',
    });

    // -------------------------------------------------------------
    // Category 3: Heat mitigation
    // -------------------------------------------------------------
    const heatPriority: SolutionPriority =
      scenario === 'accelerated' || risks.heat.level === 'VERY_HIGH'
        ? 'Critical'
        : isHeatSevere
        ? 'High'
        : 'Medium';
    const heatDifficulty: ImplementationDifficulty = 'Moderate';
    const heatStage = getScenarioStatusAndProgress(
      isHeatSevere ? 'Active' : 'Proposed',
      isHeatSevere ? 65 : 30
    );

    solutions.push({
      id: 'sol-heat-mitig',
      title: 'High-Albedo Cool Roofs & Urban Forest Canopy Expansion',
      category: 'Heat mitigation',
      problemAddressed: `Projected surface temperature reaching ${tempTrend.value.toFixed(1)}°C (${tempSign}${tempTrend.anomaly.toFixed(1)}°C above 2015-2024 baseline) with approximately ${risks.heat.extremeDays ?? 18} extreme heat days annually in ${locMeta.name}.`,
      recommendedAction: 'Apply high-solar-reflectance (albedo >= 0.70) coatings on municipal and residential roofs, and plant native high-transpiration shade trees along public transit networks.',
      expectedBenefit: 'Reduces localized surface microclimate temperatures by 1.2°C to 2.3°C and cuts peak electrical air conditioning loads by up to 18%.',
      priority: heatPriority,
      implementationDifficulty: heatDifficulty,
      relevantRisk: 'Urban Heat Island (UHI) & Thermal Stress',
      status: heatStage.status,
      progress: heatStage.progress,
      timeHorizon: horizon,
      iconName: 'Flame',
    });

    // -------------------------------------------------------------
    // Category 4: Agriculture
    // -------------------------------------------------------------
    const agriPriority: SolutionPriority =
      scenario === 'accelerated' && isDroughtSevere
        ? 'Critical'
        : isDroughtSevere || tempTrend.value > 29
        ? 'High'
        : 'Medium';
    const agriDifficulty: ImplementationDifficulty = 'Moderate';
    const agriStage = getScenarioStatusAndProgress('Planned', 45);

    solutions.push({
      id: 'sol-agri-resil',
      title: 'Precision Micro-Drip Irrigation & Climate-Resilient Agroforestry',
      category: 'Agriculture',
      problemAddressed: `Soil moisture stress (index: ${risks.drought.score !== null ? (risks.drought.score * 100).toFixed(0) + '%' : 'N/A'}) and high evapotranspiration rates impacting peri-urban green belts and regional food supply under ${scenarioName}.`,
      recommendedAction: 'Deploy solar-powered soil moisture telemetry, incentivize subsurface drip irrigation, and establish multi-strata agroforestry windbreaks to stabilize agricultural topsoil.',
      expectedBenefit: 'Lowers agricultural water consumption by 30% to 45% while maintaining crop thermal tolerance against summer temperature spikes.',
      priority: agriPriority,
      implementationDifficulty: agriDifficulty,
      relevantRisk: 'Agro-Ecological Vulnerability & Soil Moisture Depletion',
      status: agriStage.status,
      progress: agriStage.progress,
      timeHorizon: horizon,
      iconName: 'TreePine',
    });

    // -------------------------------------------------------------
    // Category 5: Infrastructure
    // -------------------------------------------------------------
    const infraPriority: SolutionPriority =
      scenario === 'accelerated' || risks.composite.level === 'VERY_HIGH' || risks.composite.level === 'HIGH'
        ? 'Critical'
        : year >= 2035
        ? 'High'
        : 'Medium';
    const infraDifficulty: ImplementationDifficulty = year >= 2040 ? 'Complex' : 'High';
    const infraStage = getScenarioStatusAndProgress('Planned', 30);

    solutions.push({
      id: 'sol-infra-hard',
      title: 'Heat-Resilient Transit Materials & Elevated Utility Substations',
      category: 'Infrastructure',
      problemAddressed: `Thermal expansion strain on road and rail corridors during ${tempTrend.value.toFixed(1)}°C peak conditions and flood vulnerability of electrical ground equipment during extreme weather.`,
      recommendedAction: 'Adopt polymer-modified high-shear asphalt for major transit corridors, elevate ground-level power distribution substations above projected 100-year flood lines, and reinforce storm culverts.',
      expectedBenefit: 'Extends public infrastructure service lifespan by 25% and reduces municipal outage risks during extreme meteorological events.',
      priority: infraPriority,
      implementationDifficulty: infraDifficulty,
      relevantRisk: 'Critical Physical Asset Degradation & Service Disruption',
      status: infraStage.status,
      progress: infraStage.progress,
      timeHorizon: horizon,
      iconName: 'Home',
    });

    // -------------------------------------------------------------
    // Category 6: Energy
    // -------------------------------------------------------------
    const energyPriority: SolutionPriority =
      tempTrend.value > 29 || scenario === 'accelerated'
        ? 'High'
        : 'Medium';
    const energyDifficulty: ImplementationDifficulty = year >= 2040 ? 'High' : 'Moderate';
    const energyStage = getScenarioStatusAndProgress(
      scenario === 'resilience' ? 'Active' : 'Planned',
      scenario === 'resilience' ? 70 : 40
    );

    solutions.push({
      id: 'sol-energy-grid',
      title: 'Decentralized Solar PV Microgrids with Battery Storage (BESS)',
      category: 'Energy',
      problemAddressed: `Surging peak electricity demand for cooling during extended heatwaves under ${scenarioName}, threatening localized distribution transformer overloads and brownouts.`,
      recommendedAction: 'Install rooftop solar PV arrays paired with lithium-iron-phosphate battery energy storage on municipal buildings and public hospitals, linked via automated microgrid switches.',
      expectedBenefit: 'Offsets 25% to 40% of peak cooling electrical loads and secures up to 72 hours of uninterrupted autonomous emergency power.',
      priority: energyPriority,
      implementationDifficulty: energyDifficulty,
      relevantRisk: 'Peak Grid Overload & Electrical Brownout Vulnerability',
      status: energyStage.status,
      progress: energyStage.progress,
      timeHorizon: horizon,
      iconName: 'Sun',
    });

    // -------------------------------------------------------------
    // Category 7: Emergency preparedness
    // -------------------------------------------------------------
    const emergPriority: SolutionPriority =
      scenario === 'accelerated' || risks.composite.level === 'VERY_HIGH' || risks.heat.level === 'VERY_HIGH' || risks.flood.level === 'VERY_HIGH'
        ? 'Critical'
        : 'High';
    const emergDifficulty: ImplementationDifficulty = 'Low';
    const emergStage = getScenarioStatusAndProgress('Active', 75);

    solutions.push({
      id: 'sol-emerg-prep',
      title: 'Multi-Hazard Early Warning Telemetry & Community Resilience Hubs',
      category: 'Emergency preparedness',
      problemAddressed: `Compounded multi-hazard exposure (${risks.composite.primaryDriver}) requiring rapid public alert dissemination and emergency shelter during heatwaves or extreme inundation.`,
      recommendedAction: 'Deploy solar-powered outdoor emergency siren and SMS broadcast nodes, designate climate-controlled public community centers with HEPA air filtration, and map pre-verified flood evacuation routes.',
      expectedBenefit: 'Accelerates emergency alert mobilization time by up to 60% and protects elderly and outdoor laborers from acute heat stroke and flood hazards.',
      priority: emergPriority,
      implementationDifficulty: emergDifficulty,
      relevantRisk: 'Multi-Hazard Meteorological Shocks & Public Health Hazards',
      status: emergStage.status,
      progress: emergStage.progress,
      timeHorizon: 'Immediate (0-2 years)',
      iconName: 'Award',
    });

    return solutions;
  }

  /**
   * Optional Gemini AI Personalization Layer.
   * Generates qualitative decision-support narrative grounded exclusively in verified parameters.
   * Uses deterministic fallback if Gemini is unreachable or unconfigured.
   */
  public static async generateAiExplanation(
    locMeta: { id: string; name: string; latitude: number; longitude: number },
    year: number,
    scenarioKey: ScenarioType,
    risks: ResilienceRisksSummary,
    solutions: ResilienceSolution[]
  ): Promise<ResilienceAiExplanation> {
    const scenarioDef = SCENARIO_DEFINITIONS[scenarioKey] || SCENARIO_DEFINITIONS.default;

    // Check Gemini API key
    if (!env.GEMINI_API_KEY) {
      return this.buildDeterministicAiFallback(locMeta, year, scenarioDef.name, risks);
    }

    try {
      const promptContext = [
        `Location: ${locMeta.name} (Latitude: ${locMeta.latitude}, Longitude: ${locMeta.longitude})`,
        `Target Projection Year: ${year}`,
        `Socioeconomic Scenario: ${scenarioDef.name} (${scenarioDef.tag})`,
        `Identified Risk Profile:`,
        `- Heat Risk: ${risks.heat.level} (Score: ${risks.heat.score ?? 'N/A'}, Projected extreme heat days: ${risks.heat.extremeDays ?? 'N/A'})`,
        `- Flood Risk: ${risks.flood.level} (Score: ${risks.flood.score ?? 'N/A'}, Precip: ${risks.flood.projectedPrecip ?? 'N/A'} mm/day)`,
        `- Drought Risk: ${risks.drought.level} (Score: ${risks.drought.score ?? 'N/A'})`,
        `- Air Quality: ${risks.airQuality.level} (AQI: ${risks.airQuality.aqi})`,
        `- Primary Vulnerability Driver: ${risks.composite.primaryDriver}`,
        `Formulated Resilience Solution Categories: Water management, Flood protection, Heat mitigation, Agriculture, Infrastructure, Energy, Emergency preparedness.`,
      ].join('\n');

      const systemPrompt = [
        'You are the GeoTwin 360 Climate Resilience Advisory Intelligence Layer.',
        'You provide structured, professional SaaS climate intelligence decision-support.',
        'Rules:',
        '- Do NOT invent new numbers or monetary costs.',
        '- Ground your explanation strictly in the verified parameters provided.',
        '- Do NOT use any emojis anywhere in your output.',
        '- Output MUST be valid JSON with this exact schema:',
        '{',
        '  "executiveSummary": "2-3 concise sentences explaining the localized climate adaptation priority for this municipality.",',
        '  "strategicRoadmap": [',
        '    "Short-term phase (0-2 years) focus",',
        '    "Medium-term phase (2-5 years) focus",',
        '    "Long-term phase (5-15 years) focus"',
        '  ],',
        '  "policyRecommendation": "1-2 sentences highlighting municipal zoning, building code, or capital governance guidance."',
        '}',
      ].join('\n');

      const cacheKey = GeminiService.buildCacheKey(
        'solution_personalization',
        locMeta.id,
        year,
        scenarioDef.id,
        { primaryDriver: risks.composite.primaryDriver, heatScore: risks.heat.score, floodScore: risks.flood.score }
      );

      const { data: parsed } = await GeminiService.execute<any>({
        purpose: `Solution Personalization: ${locMeta.name} (${year}, ${scenarioDef.id})`,
        cacheKey,
        systemInstruction: systemPrompt,
        contents: promptContext,
        responseMimeType: 'application/json',
        timeoutMs: 12000,
      });

      return {
        executiveSummary: parsed.executiveSummary || `Strategic resilience roadmap synthesized for ${locMeta.name} for the ${year} planning horizon under the ${scenarioDef.name}.`,
        strategicRoadmap: Array.isArray(parsed.strategicRoadmap) && parsed.strategicRoadmap.length > 0
          ? parsed.strategicRoadmap
          : [
              'Immediate (0-2 yrs): Early warning telemetry deployment and public cool-shelter retrofits.',
              'Medium-term (2-5 yrs): Vegetated bioswales, cool roofs, and decentralized microgrid installations.',
              'Strategic (5-15 yrs): Transit material resilience and comprehensive aquifer recharge networks.',
            ],
        policyRecommendation: parsed.policyRecommendation || `Incorporate high-albedo cool roof mandates and permeable surface minimums into municipal building codes for ${locMeta.name}.`,
        provenance: 'Generated via Gemini 2.5 Flash grounded in verified NASA POWER and Open-Meteo telemetry',
        isFallback: false,
      };
    } catch (err: any) {
      const fallbackReason = err?.code === 'GEMINI_DAILY_QUOTA_EXCEEDED'
        ? 'AI analysis is temporarily unavailable. Your daily AI quota has been reached. Core GeoTwin features remain available.'
        : 'AI service temporarily unavailable. Using domain-grounded deterministic assessment.';
      console.warn('[SolutionService] Gemini personalization fallback engaged:', err.message || err);
      return this.buildDeterministicAiFallback(locMeta, year, scenarioDef.name, risks, fallbackReason);
    }
  }

  /**
   * Deterministic decision-support fallback narrative when Gemini is disabled or unreachable.
   */
  private static buildDeterministicAiFallback(
    locMeta: { id: string; name: string },
    year: number,
    scenarioName: string,
    risks: ResilienceRisksSummary,
    fallbackReason?: string
  ): ResilienceAiExplanation {
    const primaryDriver = risks.composite.primaryDriver || 'thermal and hydrological variations';

    return {
      executiveSummary: `For ${locMeta.name}, the ${year} resilience strategy under the ${scenarioName} targets ${primaryDriver}. Interventions prioritize mitigating extreme heat and managing surface hydrological runoff through integrated nature-based and physical infrastructure adaptations.`,
      strategicRoadmap: [
        'Phase 1 (Immediate 0-2 yrs): Deploy multi-hazard early warning telemetry, inspect stormwater drains, and establish designated community cooling centers.',
        'Phase 2 (Medium-term 2-5 yrs): Enact high-albedo cool roof programs, install bioswale infiltration corridors, and pilot decentralized solar microgrids.',
        'Phase 3 (Strategic 5-15 yrs): Implement comprehensive aquifer recharge networks, resilient transit coatings, and agricultural precision irrigation at scale.',
      ],
      policyRecommendation: `Recommend updating municipal building bylaws to mandate permeable pavement for parking lots and require high-reflectance cool coatings on commercial flat roofs across ${locMeta.name}.`,
      provenance: 'Deterministic climate intelligence model grounded in NASA POWER satellite observations',
      isFallback: true,
      fallbackReason,
    };
  }
}
