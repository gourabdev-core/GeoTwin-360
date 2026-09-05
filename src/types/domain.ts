export interface LocationContext {
  id: string;
  name: string;
  city?: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
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
  sustainabilityScore: SustainabilityScore;
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

