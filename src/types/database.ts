export interface DatabaseUser {
  id: string; // UUID (matches auth.users.id)
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string; // 'USER' | 'ADMIN'
  created_at: string;
  updated_at: string;
}

export interface DatabaseLocation {
  id: string; // UUID
  name: string;
  city?: string | null;
  region?: string | null;
  country: string;
  country_code?: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  geometry?: any | null; // PostGIS Point Geometry
  created_at: string;
  updated_at: string;
}

export interface DatabaseClimateObservation {
  id: string; // UUID
  location_id: string; // UUID FK
  observed_at: string;
  temperature?: number | null;
  water_availability?: number | null;
  air_quality_index?: number | null;
  green_cover?: number | null;
  co2_emissions?: number | null;
  source?: string | null;
  source_record_id?: string | null;
  created_at: string;
  metadata?: any | null; // JSONB
}

export interface DatabaseClimateProjection {
  id: string; // UUID
  location_id: string; // UUID FK
  target_year: number;
  model_name?: string | null;
  scenario_name?: string | null;
  temperature?: number | null;
  water_availability?: number | null;
  air_quality_index?: number | null;
  green_cover?: number | null;
  co2_emissions?: number | null;
  confidence?: number | null;
  source?: string | null;
  created_at: string;
  metadata?: any | null; // JSONB
}

export interface DatabaseRiskAssessment {
  id: string; // UUID
  location_id: string; // UUID FK
  metric: string; // TEMPERATURE, FLOOD, AIR_QUALITY, WATER_STRESS, GREEN_COVER
  period_type: string; // YEAR
  period_value: number; // Year integer
  score: number;
  level: string; // VERY_HIGH, HIGH, MEDIUM, LOW, VERY_LOW
  source?: string | null;
  geometry?: any | null; // PostGIS Polygon Geometry
  metadata?: any | null; // JSONB
  created_at: string;
}

export interface DatabaseIntervention {
  id: string; // UUID
  name: string;
  slug: string;
  description?: string | null;
  category: string; // GREEN_INFRASTRUCTURE, RENEWABLE_ENERGY, WATER, etc.
  active: boolean;
  default_parameters?: any | null; // JSONB
  created_at: string;
  updated_at: string;
}

export interface DatabaseScenario {
  id: string; // UUID
  user_id: string; // UUID FK
  location_id: string; // UUID FK
  name: string;
  description?: string | null;
  target_year: number;
  status: string; // DRAFT, READY, SIMULATED, ARCHIVED
  created_at: string;
  updated_at: string;
}

export interface DatabaseScenarioIntervention {
  id: string; // UUID
  scenario_id: string; // UUID FK
  intervention_id: string; // UUID FK
  parameters?: any | null; // JSONB
  quantity: number;
  enabled: boolean;
  created_at: string;
}

export interface DatabaseSimulationRun {
  id: string; // UUID
  scenario_id: string; // UUID FK
  user_id: string; // UUID FK
  location_id: string; // UUID FK
  target_year: number;
  status: string; // PENDING, RUNNING, COMPLETED, FAILED
  engine_version: string;
  input_snapshot: any; // JSONB input parameters snapshot
  assumptions?: any | null; // JSONB
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface DatabaseSimulationResult {
  id: string; // UUID
  simulation_run_id: string; // UUID FK
  metric: string;
  baseline_value?: number | null;
  simulated_value?: number | null;
  delta_value?: number | null;
  unit?: string | null;
  direction?: string | null; // IMPROVEMENT, REGRESSION, NEUTRAL
  created_at: string;
}

export interface DatabaseSustainabilityScore {
  id: string; // UUID
  simulation_run_id: string; // UUID FK
  score_type: string; // BASELINE, SIMULATED
  overall_score: number;
  heat_score?: number | null;
  flood_score?: number | null;
  water_score?: number | null;
  air_quality_score?: number | null;
  green_cover_score?: number | null;
  carbon_score?: number | null;
  weights?: any | null; // JSONB weights used for scoring
  created_at: string;
}

export interface DatabaseAIRecommendation {
  id: string; // UUID
  user_id: string; // UUID FK
  location_id: string; // UUID FK
  simulation_run_id: string; // UUID FK
  target_year: number;
  summary: string;
  recommendations: any; // JSONB structured output
  model_provider?: string | null;
  model_name?: string | null;
  prompt_version?: string | null;
  created_at: string;
}

export interface DatabaseReport {
  id: string; // UUID
  user_id: string; // UUID FK
  location_id: string; // UUID FK
  scenario_id: string; // UUID FK
  simulation_run_id: string; // UUID FK
  title: string;
  status: string; // GENERATING, READY, FAILED, EXPIRED
  file_url?: string | null;
  storage_key?: string | null;
  generated_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}
