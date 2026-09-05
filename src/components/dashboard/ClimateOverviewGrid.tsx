import React from 'react';
import { ClimateMetricCard } from './ClimateMetricCard.js';
import { ClimateMetrics } from '../../types/domain.js';
import { usePreferences } from '../../context/PreferencesContext.js';

interface ClimateOverviewGridProps {
  metrics: ClimateMetrics | null;
  floodRiskLevel: string | null;
  loading: boolean;
  error: string | null;
  floodRiskLoading: boolean;
  floodRiskError: string | null;
  heatRiskLevel?: string | null;
}

export const ClimateOverviewGrid: React.FC<ClimateOverviewGridProps> = ({
  metrics,
  floodRiskLevel,
  loading,
  error,
  floodRiskLoading,
  floodRiskError,
  heatRiskLevel,
}) => {
  const { preferences } = usePreferences();
  // Bind UI directly to live backend payload properties via standard null-chaining
  const rawTempValue = metrics?.temperature?.value ?? null;
  const isFahrenheit = preferences.temperatureUnit === 'fahrenheit';
  const tempValue = rawTempValue !== null
    ? (isFahrenheit ? Number(((rawTempValue * 9) / 5 + 32).toFixed(1)) : Number(rawTempValue.toFixed(1)))
    : null;
  const tempUnit = isFahrenheit ? '°F' : (metrics?.temperature?.unit ?? '°C');
  const heatIndicator = heatRiskLevel && heatRiskLevel !== 'UNAVAILABLE' ? ` (${heatRiskLevel.replace('_', ' ')})` : '';

  const floodValue = floodRiskLevel ? floodRiskLevel.replace('_', ' ') : null;

  const waterValue = metrics?.waterAvailability?.value ?? (metrics?.waterAvailability?.stressLevel ?? null);
  const waterUnit = metrics?.waterAvailability?.value != null ? (metrics?.waterAvailability?.unit ?? '%') : '';

  const aqiValue = metrics?.airQuality?.aqi ?? null;
  const aqiUnit = metrics?.airQuality?.category ? `(${metrics.airQuality.category})` : '';

  const greenValue = metrics?.greenCover?.value ?? null;
  const greenUnit = metrics?.greenCover?.unit ?? '%';

  const co2Value = metrics?.co2Emissions?.value ?? null;
  const co2Unit = metrics?.co2Emissions?.unit ?? '';

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 1. Average Temperature */}
      <ClimateMetricCard
        name="Avg Temperature"
        value={tempValue}
        unit={`${tempUnit}${heatIndicator}`}
        loading={loading}
        error={error}
        dateOrYear="2026 YTD"
        sourceOrStatus="NASA / Open-Meteo"
      />

      {/* 2. Flood Risk */}
      <ClimateMetricCard
        name="Flood Risk"
        value={floodValue}
        unit=""
        loading={floodRiskLoading}
        error={floodRiskError}
        dateOrYear="Current"
        sourceOrStatus="Hydrologic Model"
      />

      {/* 3. Water Availability */}
      <ClimateMetricCard
        name="Water Availability"
        value={waterValue}
        unit={waterUnit}
        loading={loading}
        error={error}
        dateOrYear="2026 Active"
        sourceOrStatus="Open-Meteo Telemetry"
      />

      {/* 4. Air Quality */}
      <ClimateMetricCard
        name="Air Quality (AQI)"
        value={aqiValue}
        unit={aqiUnit}
        loading={loading}
        error={error}
        dateOrYear="Live Telemetry"
        sourceOrStatus="Open-Meteo Telemetry"
      />

      {/* 5. Green Cover */}
      <ClimateMetricCard
        name="Green Cover"
        value={greenValue}
        unit={greenUnit}
        loading={loading}
        error={error}
        dateOrYear="Current"
        sourceOrStatus="Sentinel-2 Telemetry"
      />

      {/* 6. CO2 Emissions */}
      <ClimateMetricCard
        name="CO2 Emissions"
        value={co2Value}
        unit={co2Unit}
        loading={loading}
        error={error}
        dateOrYear="vs 2025 Baseline"
        sourceOrStatus="Regional Inventory"
      />
    </div>
  );
};
export default ClimateOverviewGrid;
