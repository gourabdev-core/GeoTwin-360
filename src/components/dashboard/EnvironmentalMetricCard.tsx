import React from 'react';
import { ClimateMetricCard } from './ClimateMetricCard.js';

interface EnvironmentalMetricCardProps {
  name: string;
  value: string | number | null;
  unit: string;
  loading: boolean;
  error: string | null;
}

export const EnvironmentalMetricCard: React.FC<EnvironmentalMetricCardProps> = ({
  name,
  value,
  unit,
  loading,
  error,
}) => {
  return (
    <ClimateMetricCard
      name={name}
      value={value}
      unit={unit}
      loading={loading}
      error={error}
    />
  );
};
export default EnvironmentalMetricCard;
