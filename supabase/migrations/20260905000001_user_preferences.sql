-- GeoTwin 360 — Supabase Schema Migration: User Preferences
-- Target: PostgreSQL + PostGIS (Supabase compatible)
-- Non-destructive: Adds preferences JSONB column to public.profiles

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "temperatureUnit": "celsius",
  "defaultTargetYear": 2035,
  "defaultScenario": "resilience",
  "defaultLocationId": "loc-22.5726-88.3639",
  "defaultLocationName": "Kolkata, West Bengal, India"
}'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.profiles.preferences IS 'User application preferences including default target year, scenario, location, and units';
