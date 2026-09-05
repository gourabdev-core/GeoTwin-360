export interface LocationContext {
  id: string;
  name: string;
  city?: string;
  region?: string;
  state?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  displayName?: string;
}

export type RiskLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

export interface MetricValue<T = number | string> {
  value: T;
  unit: string;
  stressLevel?: string;
}

export interface AirQualityMetric {
  aqi: number;
  category: string;
}

export interface ClimateMetrics {
  temperature: MetricValue<number>;
  waterAvailability: MetricValue<number | string>;
  airQuality: AirQualityMetric;
  greenCover: MetricValue<number>;
  co2Emissions: MetricValue<number | string>;
}

export type InterventionCategory =
  | 'GREEN_INFRASTRUCTURE'
  | 'RENEWABLE_ENERGY'
  | 'WATER'
  | 'BUILDINGS'
  | 'TRANSPORT'
  | 'DRAINAGE'
  | 'OTHER';

export interface Intervention {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: InterventionCategory;
  quantity?: number;
  enabled?: boolean;
}

export interface SustainabilityScore {
  before: number;
  after: number;
  improvement: number;
}

export interface SimulationResult {
  simulationId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  locationId: string;
  targetYear: number;
  scenario?: string;
  scenarioName?: string;
  baseline: {
    temperature: number | null;
    precipitation?: number | null;
    heatRisk?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    floodRisk: RiskLevel | 'UNAVAILABLE';
    floodRiskDetails?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    waterAvailability: number | null;
    waterStress?: {
      level: RiskLevel | 'UNAVAILABLE';
      percentage: number | null;
      score: number | null;
    };
    overallRiskScore?: number;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  afterSimulation: {
    temperature: number | null;
    precipitation?: number | null;
    heatRisk?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    floodRisk: RiskLevel | 'UNAVAILABLE';
    floodRiskDetails?: {
      level: RiskLevel | 'UNAVAILABLE';
      score: number | null;
    };
    waterAvailability: number | null;
    waterStress?: {
      level: RiskLevel | 'UNAVAILABLE';
      percentage: number | null;
      score: number | null;
    };
    overallRiskScore?: number;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  impact: {
    temperature: number | null;
    precipitation?: number | null;
    heatRisk?: {
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    floodRisk?: {
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    waterStress?: {
      deltaPercentage: number;
      deltaScore: number;
      fromLevel: string;
      toLevel: string;
    };
    overallRiskScore?: {
      before: number;
      after: number;
      change: number;
    };
    waterAvailability: number | null;
    airQualityIndex: number | null;
    greenCover: number | null;
    co2Emissions: number | null;
  };
  sustainabilityScore: SustainabilityScore;
  provenance?: {
    engineVersion: string;
    modelType: string;
    isOfficialForecast: boolean;
    disclaimer: string;
    dataSource: string;
  };
}

export interface WeatherForecastPoint {
  timestamp: string;
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon?: string;
  windSpeed: number;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  description: string;
  observedAt: string;
  source: string;
  dataType: 'LIVE' | 'CACHED' | 'FALLBACK' | 'current/live' | 'cached' | 'fallback';
  retrievedAt: string;
  icon?: string;
  aqi?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: WeatherForecastPoint[];
}


export interface ClimateMetric {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  type: 'OBSERVED' | 'HISTORICAL' | 'PROJECTED' | 'SIMULATED';
}

export interface RiskMetric {
  metric: string;
  score: number | null;
  level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' | null;
  type: 'OBSERVED' | 'HISTORICAL' | 'PROJECTED' | 'SIMULATED';
}

export interface EnvironmentalMetric {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  category?: string;
}

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
  dataDistinction?: AIDataDistinction;
  isFallback?: boolean;
  fallbackReason?: string;

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
    scenario?: string;
    hasSimulationData: boolean;
    hasCurrentClimate: boolean;
    hasPredictionData: boolean;
    hasRiskData: boolean;
  };
}

