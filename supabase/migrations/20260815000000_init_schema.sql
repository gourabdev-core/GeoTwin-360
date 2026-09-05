-- GeoTwin 360 — Database Schema Migration
-- Target: PostgreSQL + PostGIS (Supabase compatible)

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- (Dummy auth schema block removed for production Supabase compatibility)

-- =========================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.populate_location_geometry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geometry = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 4. TABLES
-- =========================================================================

-- users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(150),
  region VARCHAR(150),
  country VARCHAR(150) NOT NULL,
  country_code VARCHAR(10),
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  timezone VARCHAR(80),
  geometry GEOGRAPHY(Point, 4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_lat_lng_key UNIQUE (latitude, longitude)
);

-- climate_observations
CREATE TABLE IF NOT EXISTS public.climate_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature DECIMAL,
  water_availability DECIMAL,
  air_quality_index DECIMAL,
  green_cover DECIMAL,
  co2_emissions DECIMAL,
  source VARCHAR(100),
  source_record_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- climate_projections
CREATE TABLE IF NOT EXISTS public.climate_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  model_name VARCHAR(100),
  scenario_name VARCHAR(100),
  temperature DECIMAL,
  water_availability DECIMAL,
  air_quality_index DECIMAL,
  green_cover DECIMAL,
  co2_emissions DECIMAL,
  confidence DECIMAL,
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- risk_assessments
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL, -- TEMPERATURE, FLOOD, AIR_QUALITY, WATER_STRESS, GREEN_COVER
  period_type VARCHAR(50) NOT NULL, -- YEAR
  period_value INTEGER NOT NULL, -- year value
  score DECIMAL NOT NULL, -- 0 to 1 or 0 to 100
  level VARCHAR(20) NOT NULL, -- VERY_HIGH, HIGH, MEDIUM, LOW, VERY_LOW
  source VARCHAR(100),
  geometry GEOGRAPHY(Polygon, 4326),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- interventions
CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- GREEN_INFRASTRUCTURE, RENEWABLE_ENERGY, WATER, BUILDINGS, TRANSPORT, AIR_QUALITY, DRAINAGE, OTHER
  active BOOLEAN NOT NULL DEFAULT TRUE,
  default_parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- scenarios
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_year INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, READY, SIMULATED, ARCHIVED
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- scenario_interventions
CREATE TABLE IF NOT EXISTS public.scenario_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  parameters JSONB,
  quantity DECIMAL NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT scenario_intervention_uniq UNIQUE (scenario_id, intervention_id)
);

-- simulation_runs
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
  engine_version VARCHAR(30) NOT NULL,
  input_snapshot JSONB NOT NULL,
  assumptions JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- simulation_results
CREATE TABLE IF NOT EXISTS public.simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL,
  baseline_value DECIMAL,
  simulated_value DECIMAL,
  delta_value DECIMAL,
  unit VARCHAR(30),
  direction VARCHAR(30), -- IMPROVEMENT, REGRESSION, NEUTRAL
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- sustainability_scores
CREATE TABLE IF NOT EXISTS public.sustainability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  score_type VARCHAR(30) NOT NULL, -- BASELINE, SIMULATED
  overall_score DECIMAL NOT NULL,
  heat_score DECIMAL,
  flood_score DECIMAL,
  water_score DECIMAL,
  air_quality_score DECIMAL,
  green_cover_score DECIMAL,
  carbon_score DECIMAL,
  weights JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  simulation_run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  summary TEXT NOT NULL,
  recommendations JSONB NOT NULL,
  model_provider VARCHAR(50),
  model_name VARCHAR(100),
  prompt_version VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  simulation_run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'GENERATING', -- GENERATING, READY, FAILED, EXPIRED
  file_url TEXT,
  storage_key VARCHAR(255),
  generated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 5. TRIGGERS REGISTRATION
-- =========================================================================
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON public.users;
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_locations_updated_at ON public.locations;
CREATE TRIGGER trigger_update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_interventions_updated_at ON public.interventions;
CREATE TRIGGER trigger_update_interventions_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_scenarios_updated_at ON public.scenarios;
CREATE TRIGGER trigger_update_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_populate_location_geometry ON public.locations;
CREATE TRIGGER trigger_populate_location_geometry
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.populate_location_geometry();

-- =========================================================================
-- 6. INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

CREATE INDEX IF NOT EXISTS locations_name_idx ON public.locations(name);
CREATE INDEX IF NOT EXISTS locations_country_idx ON public.locations(country);
CREATE INDEX IF NOT EXISTS locations_coordinates_idx ON public.locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS locations_geometry_idx ON public.locations USING GIST(geometry);

CREATE INDEX IF NOT EXISTS climate_observations_location_idx ON public.climate_observations(location_id);
CREATE INDEX IF NOT EXISTS climate_observations_observed_at_idx ON public.climate_observations(observed_at);

CREATE INDEX IF NOT EXISTS climate_projections_location_idx ON public.climate_projections(location_id);
CREATE INDEX IF NOT EXISTS climate_projections_target_year_idx ON public.climate_projections(target_year);

CREATE INDEX IF NOT EXISTS risk_assessments_location_idx ON public.risk_assessments(location_id);
CREATE INDEX IF NOT EXISTS risk_assessments_metric_idx ON public.risk_assessments(metric);
CREATE INDEX IF NOT EXISTS risk_assessments_period_idx ON public.risk_assessments(period_value);
CREATE INDEX IF NOT EXISTS risk_assessments_geometry_idx ON public.risk_assessments USING GIST(geometry);

CREATE INDEX IF NOT EXISTS scenarios_user_idx ON public.scenarios(user_id);
CREATE INDEX IF NOT EXISTS scenarios_location_idx ON public.scenarios(location_id);
CREATE INDEX IF NOT EXISTS scenarios_target_year_idx ON public.scenarios(target_year);

CREATE INDEX IF NOT EXISTS scenario_interventions_scenario_idx ON public.scenario_interventions(scenario_id);
CREATE INDEX IF NOT EXISTS scenario_interventions_intervention_idx ON public.scenario_interventions(intervention_id);

CREATE INDEX IF NOT EXISTS simulation_runs_scenario_idx ON public.simulation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS simulation_runs_location_idx ON public.simulation_runs(location_id);
CREATE INDEX IF NOT EXISTS simulation_runs_status_idx ON public.simulation_runs(status);

CREATE INDEX IF NOT EXISTS simulation_results_run_idx ON public.simulation_results(simulation_run_id);

CREATE INDEX IF NOT EXISTS sustainability_scores_run_idx ON public.sustainability_scores(simulation_run_id);

CREATE INDEX IF NOT EXISTS ai_recommendations_location_idx ON public.ai_recommendations(location_id);
CREATE INDEX IF NOT EXISTS ai_recommendations_run_idx ON public.ai_recommendations(simulation_run_id);

CREATE INDEX IF NOT EXISTS reports_user_idx ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS reports_location_idx ON public.reports(location_id);
CREATE INDEX IF NOT EXISTS reports_run_idx ON public.reports(simulation_run_id);

-- =========================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Public read-only tables policies
DROP POLICY IF EXISTS select_locations ON public.locations;
CREATE POLICY select_locations ON public.locations FOR SELECT USING (true);

DROP POLICY IF EXISTS select_climate_observations ON public.climate_observations;
CREATE POLICY select_climate_observations ON public.climate_observations FOR SELECT USING (true);

DROP POLICY IF EXISTS select_climate_projections ON public.climate_projections;
CREATE POLICY select_climate_projections ON public.climate_projections FOR SELECT USING (true);

DROP POLICY IF EXISTS select_risk_assessments ON public.risk_assessments;
CREATE POLICY select_risk_assessments ON public.risk_assessments FOR SELECT USING (true);

DROP POLICY IF EXISTS select_interventions ON public.interventions;
CREATE POLICY select_interventions ON public.interventions FOR SELECT USING (true);

-- Private user-scoped policies
DROP POLICY IF EXISTS select_users ON public.users;
CREATE POLICY select_users ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS update_users ON public.users;
CREATE POLICY update_users ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS select_scenarios ON public.scenarios;
CREATE POLICY select_scenarios ON public.scenarios FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_scenarios ON public.scenarios;
CREATE POLICY insert_scenarios ON public.scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_scenarios ON public.scenarios;
CREATE POLICY update_scenarios ON public.scenarios FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_scenarios ON public.scenarios;
CREATE POLICY delete_scenarios ON public.scenarios FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS select_scenario_interventions ON public.scenario_interventions;
CREATE POLICY select_scenario_interventions ON public.scenario_interventions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scenarios WHERE public.scenarios.id = scenario_interventions.scenario_id AND public.scenarios.user_id = auth.uid()));

DROP POLICY IF EXISTS insert_scenario_interventions ON public.scenario_interventions;
CREATE POLICY insert_scenario_interventions ON public.scenario_interventions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scenarios WHERE public.scenarios.id = scenario_interventions.scenario_id AND public.scenarios.user_id = auth.uid()));

DROP POLICY IF EXISTS update_scenario_interventions ON public.scenario_interventions;
CREATE POLICY update_scenario_interventions ON public.scenario_interventions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scenarios WHERE public.scenarios.id = scenario_interventions.scenario_id AND public.scenarios.user_id = auth.uid()));

DROP POLICY IF EXISTS delete_scenario_interventions ON public.scenario_interventions;
CREATE POLICY delete_scenario_interventions ON public.scenario_interventions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.scenarios WHERE public.scenarios.id = scenario_interventions.scenario_id AND public.scenarios.user_id = auth.uid()));

DROP POLICY IF EXISTS select_simulation_runs ON public.simulation_runs;
CREATE POLICY select_simulation_runs ON public.simulation_runs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_simulation_runs ON public.simulation_runs;
CREATE POLICY insert_simulation_runs ON public.simulation_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_simulation_runs ON public.simulation_runs;
CREATE POLICY update_simulation_runs ON public.simulation_runs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS select_simulation_results ON public.simulation_results;
CREATE POLICY select_simulation_results ON public.simulation_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.simulation_runs WHERE public.simulation_runs.id = simulation_results.simulation_run_id AND public.simulation_runs.user_id = auth.uid()));

DROP POLICY IF EXISTS select_sustainability_scores ON public.sustainability_scores;
CREATE POLICY select_sustainability_scores ON public.sustainability_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.simulation_runs WHERE public.simulation_runs.id = sustainability_scores.simulation_run_id AND public.simulation_runs.user_id = auth.uid()));

DROP POLICY IF EXISTS select_ai_recommendations ON public.ai_recommendations;
CREATE POLICY select_ai_recommendations ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_ai_recommendations ON public.ai_recommendations;
CREATE POLICY insert_ai_recommendations ON public.ai_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS select_reports ON public.reports;
CREATE POLICY select_reports ON public.reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_reports ON public.reports;
CREATE POLICY insert_reports ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_reports ON public.reports;
CREATE POLICY update_reports ON public.reports FOR UPDATE USING (auth.uid() = user_id);

-- =========================================================================
-- 8. AUTH TRIGGERS FOR SYNCING USER PROFILES
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'USER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 9. SEED STATIC DATA (LOCATIONS & INTERVENTIONS)
-- =========================================================================

-- (Location seed data removed. Locations are resolved dynamically via geocoding)

-- Seed interventions
INSERT INTO public.interventions (name, slug, description, category, active, default_parameters)
VALUES
  ('Plant Trees', 'plant-trees', 'Increase urban green cover to lower heat island effects and absorb CO2.', 'GREEN_INFRASTRUCTURE', TRUE, '{"temperature": {"direction": "decrease", "impact": 0.5}, "green_cover": {"direction": "increase", "impact": 4.0}, "co2_emissions": {"direction": "decrease", "impact": 0.3}}'::jsonb),
  ('Install Solar Panels', 'install-solar-panels', 'Deploy rooftop solar grids to replace coal/gas energy.', 'RENEWABLE_ENERGY', TRUE, '{"co2_emissions": {"direction": "decrease", "impact": 1.2}}'::jsonb),
  ('Rainwater Harvesting', 'rainwater-harvesting', 'Implement storage systems to capture surface runoff and recharge aquifers.', 'WATER', TRUE, '{"water_availability": {"direction": "increase", "impact": 5.0}}'::jsonb),
  ('Cool Roof Initiative', 'cool-roof-initiative', 'Apply reflective coatings to urban building roofs to reduce energy load and temperatures.', 'BUILDINGS', TRUE, '{"temperature": {"direction": "decrease", "impact": 0.8}}'::jsonb),
  ('Electric Public Transport', 'electric-public-transport', 'Replace fossil-fuel bus systems with electric vehicle fleets.', 'TRANSPORT', TRUE, '{"co2_emissions": {"direction": "decrease", "impact": 0.8}, "air_quality_index": {"direction": "decrease", "impact": 15.0}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
