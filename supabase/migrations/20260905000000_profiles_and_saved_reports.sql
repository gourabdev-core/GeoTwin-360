-- GeoTwin 360 — Supabase Schema Migration
-- Profiles, Saved Reports, Locations, and Scenarios Schema Proposal
-- Target: PostgreSQL + PostGIS (Supabase compatible)
-- Non-destructive: Does NOT drop or modify existing tables or data.

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =========================================================================
-- 2. HELPER FUNCTIONS
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 3. PROFILES TABLE
-- Complements auth.users and public.users for SaaS user profile management
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120),
  email VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'Sustainability Lead',
  organization VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Profiles trigger
DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill profiles from existing public.users (if any exist)
INSERT INTO public.profiles (id, full_name, email, avatar_url, role, created_at, updated_at)
SELECT 
  id, 
  name AS full_name, 
  email, 
  avatar_url, 
  COALESCE(role, 'Sustainability Lead') AS role,
  created_at, 
  updated_at
FROM public.users
ON CONFLICT (id) DO NOTHING;

-- Index for profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- =========================================================================
-- 4. SAVED REPORTS TABLE
-- Allows users to save, bookmark, and manage climate scenario reports
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'READY', -- DRAFT, GENERATING, READY, FAILED, ARCHIVED
  file_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Saved Reports trigger
DROP TRIGGER IF EXISTS trigger_update_saved_reports_updated_at ON public.saved_reports;
CREATE TRIGGER trigger_update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for saved_reports
CREATE INDEX IF NOT EXISTS saved_reports_user_idx ON public.saved_reports(user_id);
CREATE INDEX IF NOT EXISTS saved_reports_location_idx ON public.saved_reports(location_id);
CREATE INDEX IF NOT EXISTS saved_reports_scenario_idx ON public.saved_reports(scenario_id);
CREATE INDEX IF NOT EXISTS saved_reports_created_at_idx ON public.saved_reports(created_at DESC);

-- Row Level Security (RLS) for saved_reports
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved reports" ON public.saved_reports;
CREATE POLICY "Users can view their own saved reports" 
  ON public.saved_reports FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved reports" ON public.saved_reports;
CREATE POLICY "Users can insert their own saved reports" 
  ON public.saved_reports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved reports" ON public.saved_reports;
CREATE POLICY "Users can update their own saved reports" 
  ON public.saved_reports FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved reports" ON public.saved_reports;
CREATE POLICY "Users can delete their own saved reports" 
  ON public.saved_reports FOR DELETE 
  USING (auth.uid() = user_id);

-- =========================================================================
-- 5. LOCATIONS TABLE (Non-destructive validation / update)
-- =========================================================================
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

CREATE INDEX IF NOT EXISTS locations_name_idx ON public.locations(name);
CREATE INDEX IF NOT EXISTS locations_country_idx ON public.locations(country);
CREATE INDEX IF NOT EXISTS locations_coordinates_idx ON public.locations(latitude, longitude);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view locations" ON public.locations;
CREATE POLICY "Public can view locations" 
  ON public.locations FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;
CREATE POLICY "Authenticated users can insert locations" 
  ON public.locations FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- =========================================================================
-- 6. SCENARIOS TABLE (Non-destructive validation / update)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_year INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, READY, SIMULATED, ARCHIVED
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenarios_user_idx ON public.scenarios(user_id);
CREATE INDEX IF NOT EXISTS scenarios_location_idx ON public.scenarios(location_id);
CREATE INDEX IF NOT EXISTS scenarios_target_year_idx ON public.scenarios(target_year);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scenarios" ON public.scenarios;
CREATE POLICY "Users can view their own scenarios" 
  ON public.scenarios FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scenarios" ON public.scenarios;
CREATE POLICY "Users can insert their own scenarios" 
  ON public.scenarios FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scenarios" ON public.scenarios;
CREATE POLICY "Users can update their own scenarios" 
  ON public.scenarios FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scenarios" ON public.scenarios;
CREATE POLICY "Users can delete their own scenarios" 
  ON public.scenarios FOR DELETE 
  USING (auth.uid() = user_id);

-- =========================================================================
-- 7. SYNCHRONIZATION TRIGGER (auth.users -> profiles & users)
-- Automatically inserts into both public.profiles and public.users on signup
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  extracted_avatar TEXT;
BEGIN
  extracted_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );
  extracted_avatar := new.raw_user_meta_data->>'avatar_url';

  -- Insert into public.users for backwards compatibility
  INSERT INTO public.users (id, name, email, avatar_url, role)
  VALUES (
    new.id,
    extracted_name,
    new.email,
    extracted_avatar,
    'USER'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    new.id,
    extracted_name,
    new.email,
    extracted_avatar,
    'Sustainability Lead'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
