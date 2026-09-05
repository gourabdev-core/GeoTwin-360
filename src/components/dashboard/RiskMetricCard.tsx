import React from 'react';
import { ClimateMetricCard } from './ClimateMetricCard.js';

interface RiskMetricCardProps {
  name: string;
  value: string | number | null;
  loading: boolean;
  error: string | null;
}

export const RiskMetricCard: React.FC<RiskMetricCardProps> = ({
  name,
  value,
  loading,
  error,
}) => {
  return (
    <ClimateMetricCard
      name={name}
      value={value}
      unit=""
      loading={loading}
      error={error}
    />
  );
};
export default RiskMetricCard;
