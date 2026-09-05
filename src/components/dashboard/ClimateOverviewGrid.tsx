import React from 'react';
import { ClimateMetricCard } from './ClimateMetricCard.js';
import { ClimateMetrics } from '../../types/domain.js';

interface ClimateOverviewGridProps {
  metrics: ClimateMetrics | null;
  floodRiskLevel: string | null;
  loading: boolean;
  error: string | null;
  floodRiskLoading: boolean;
  floodRiskError: string | null;
}

export const ClimateOverviewGrid: React.FC<ClimateOverviewGridProps> = ({
  metrics,
  floodRiskLevel,
  loading,
  error,
  floodRiskLoading,
  floodRiskError,
}) => {
  // Bind UI directly to live backend payload properties via standard null-chaining
  const tempValue = metrics?.temperature?.value ?? null;
  const tempUnit = metrics?.temperature?.unit ?? '°C';

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
        unit={tempUnit}
        loading={loading}
        error={error}
      />

      {/* 2. Flood Risk */}
      <ClimateMetricCard
        name="Flood Risk"
        value={floodValue}
        unit=""
        loading={floodRiskLoading}
        error={floodRiskError}
      />

      {/* 3. Water Availability */}
      <ClimateMetricCard
        name="Water Availability"
        value={waterValue}
        unit={waterUnit}
        loading={loading}
        error={error}
      />

      {/* 4. Air Quality */}
      <ClimateMetricCard
        name="Air Quality (AQI)"
        value={aqiValue}
        unit={aqiUnit}
        loading={loading}
        error={error}
      />

      {/* 5. Green Cover */}
      <ClimateMetricCard
        name="Green Cover"
        value={greenValue}
        unit={greenUnit}
        loading={loading}
        error={error}
      />

      {/* 6. CO2 Emissions */}
      <ClimateMetricCard
        name="CO2 Emissions"
        value={co2Value}
        unit={co2Unit}
        loading={loading}
        error={error}
      />
    </div>
  );
};
export default ClimateOverviewGrid;
