# Data Sources — Unified Climate Data Layer

This document outlines the external data sources and APIs integrated into the GeoTwin 360 Climate Data Layer.

---

## 1. OpenWeather API

OpenWeather is used for real-time weather observations, forward/reverse geocoding, and location lookup.

- **Endpoints Used:**
  - Current Weather: `https://api.openweathermap.org/data/2.5/weather`
  - Direct Geocoding (search): `http://api.openweathermap.org/geo/1.0/direct`
  - Reverse Geocoding: `http://api.openweathermap.org/geo/1.0/reverse`
- **Provided Metrics:**
  - `temperature` (Celsius)
  - `feelsLike` (feels_like in Celsius)
  - `humidity` (%)
  - `pressure` (hPa)
  - `windSpeed` (m/s)
  - `windDirection` (degrees)
  - `cloudiness` (%)
  - `description` (weather condition text)
- **Role in Platform:**
  - Live data provider for the current weather panel.
  - Coordinate resolution provider for location search and reverse geocoding.

---

## 2. NASA POWER API

The NASA Prediction Of Worldwide Energy Resources (POWER) project provides solar and meteorological datasets for support of renewable energy, agricultural efficiency, and building systems.

- **Endpoint Used:**
  - Monthly Point Temporal: `https://power.larc.nasa.gov/api/temporal/monthly/point`
- **Parameters Requested:**
  - `T2M` (Temperature at 2 Meters; Celsius)
  - `PRECTOTCORR` (Precipitation corrected; mm/day)
- **Time Range:**
  - Historical period: 2015 to 2024 (annual average values derived using standard query parameter `*13` format).
- **Role in Platform:**
  - Historical baseline provider for long-term average temperature and precipitation charts.
