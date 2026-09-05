# Architecture Reference — Unified Climate Data Layer

The Unified Climate Data Layer coordinates all real-data integrations for GeoTwin 360. It unifies real-time weather retrieval and historical observations under a single domain model, isolating provider-specific logic from the rest of the application.

## High-Level Flow

```text
                     ┌───────────────────────┐
                     │   FRONTEND / WEB APP  │
                     └───────────┬───────────┘
                                 │
                            Vite API Calls
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │     BACKEND API       │
                     │  /weather  /climate   │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    CLIMATE SERVICE    │
                     └─────┬───────────┬─────┘
                           │           │
                 ┌─────────┘           └─────────┐
                 ▼                               ▼
       ┌──────────────────┐             ┌──────────────────┐
       │ DATABASE CACHE   │             │ PROVIDER ADAPTER │
       │ (observations)   │             │ (OpenWeather /   │
       └──────────────────┘             │  NASA POWER)     │
                                        └──────────────────┘
```

## System Boundaries & Modules

### 1. Unified Domain Model (`server/types/climate.ts`)
A single typescript definition `ClimateData` serves as the internal schema for all weather and climate data. It supports:
- `location` metadata
- Coordinates (`latitude`, `longitude`)
- `observedAt` timestamp
- Core metrics: `temperature`, `feelsLike`, `humidity`, `pressure`, `precipitation`, `wind` (speed/direction)
- Provenance details: `source` (e.g. `'OpenWeather'`, `'NASA POWER'`), `dataType` (`'current/live' | 'cached' | 'historical'`), and `retrievedAt`.

### 2. Coordinating Climate Service (`server/services/climateService.ts`)
Acts as the central access layer for the application. It handles:
- Validations (coordinate boundaries check).
- Location context resolution (resolving latitude/longitude through reverse geocoding or matching saved database records).
- Cache check (reads recent `climate_observations` from Supabase to prevent redundant API queries).
- Adapter orchestration (invokes the respective live provider adapter on cache misses).
- Persistence & duplicate prevention (inserts fetched observations back into Supabase after checking that no duplicate records exist for the same location, source, and observation time).
- Graceful fallbacks (retrieves older database observations if live API fails, returning a clear error or fallback state instead of inventing arbitrary values).

### 3. Provider Adapters
- **OpenWeather Adapter (`WeatherService`):** normalizes live weather API requests into the unified `ClimateData` format with `'current/live'` data type.
- **NASA POWER Adapter (`NasaPowerService`):** normalizes historical annual point requests into a list of annual `ClimateData` points with `'historical'` data type.
